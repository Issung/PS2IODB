"""
Creating PS2 memory card images (`.ps2`), the format PCSX2 uses and that SD card based memory cards such as the
SD2PSX and MemCard PRO2 can load.

`create_card` formats a new, empty 8MB card the same way PCSX2 does and writes save directories into it.
`read_card` is a minimal reader used by the tests to check the result.

Card layout (8MB, 8192 clusters of 2 pages of 512 bytes, each page followed by 16 bytes of ECC):
    cluster 0           superblock
    cluster 8           indirect FAT, lists the clusters holding the FAT
    clusters 9-40       FAT, one u32 per allocatable cluster: next cluster | 0x80000000, 0xFFFFFFFF ends a chain,
                        0x7FFFFFFF is free
    clusters 41-8175    allocatable clusters, numbered from 0. The root directory starts at allocatable cluster 0.
    clusters 8176-8191  two backup erase blocks
A directory's contents are 512 byte entries, starting with "." and "..".
This mirrors `website/src/extractor/ps2mc.ts` and `ps2mcDir.ts`, which the website uses to read cards.
"""

import struct
from datetime import datetime, timedelta, timezone

PAGE_SIZE = 512
SPARE_SIZE = 16
RAW_PAGE_SIZE = PAGE_SIZE + SPARE_SIZE
PAGES_PER_CLUSTER = 2
PAGES_PER_ERASE_BLOCK = 16
CLUSTER_SIZE = PAGE_SIZE * PAGES_PER_CLUSTER
CLUSTERS_PER_CARD = 8192
CLUSTERS_PER_ERASE_BLOCK = PAGES_PER_ERASE_BLOCK // PAGES_PER_CLUSTER
ALLOCATABLE_CLUSTER_OFFSET = 41
ALLOCATABLE_CLUSTER_END = 8135
INDIRECT_FAT_CLUSTER = 8
FIRST_FAT_CLUSTER = 9
FAT_ENTRIES_PER_CLUSTER = CLUSTER_SIZE // 4
FAT_CLUSTER_COUNT = CLUSTERS_PER_CARD // FAT_ENTRIES_PER_CLUSTER
BACKUP_BLOCK_1 = 1023
BACKUP_BLOCK_2 = 1022
CARD_SIZE = CLUSTERS_PER_CARD * PAGES_PER_CLUSTER * RAW_PAGE_SIZE

FAT_ALLOCATED = 0x80000000
FAT_CHAIN_END = 0xFFFFFFFF
FAT_FREE = 0x7FFFFFFF

DIRENT_SIZE = 512
DIRENTS_PER_CLUSTER = CLUSTER_SIZE // DIRENT_SIZE
MAX_NAME_LENGTH = 31

DF_READ = 0x0001
DF_WRITE = 0x0002
DF_EXECUTE = 0x0004
DF_FILE = 0x0010
DF_DIR = 0x0020
DF_0080 = 0x0080
DF_0400 = 0x0400
DF_HIDDEN = 0x2000
DF_EXISTS = 0x8000
DF_RWX = DF_READ | DF_WRITE | DF_EXECUTE

MODE_DIR = DF_EXISTS | DF_0400 | DF_DIR | DF_RWX                  # 0x8427
MODE_DOTDOT = DF_EXISTS | DF_HIDDEN | DF_0400 | DF_DIR | DF_WRITE | DF_EXECUTE  # 0xA426
MODE_FILE = DF_EXISTS | DF_0400 | DF_0080 | DF_FILE | DF_RWX      # 0x8497, what a PS2 writes for save files.

_DIRENT = struct.Struct('<HHL8sLL8sL28x448s')

# PS2 timestamps are in Japan Standard Time regardless of where the console is.
JST = timezone(timedelta(hours=9))


class MemcardError(Exception):
    pass


def _make_ecc_tables():
    parity = [bin(b).count('1') & 1 for b in range(256)]
    column_masks = [0x55, 0x33, 0x0F, 0x00, 0xAA, 0xCC, 0xF0]
    column_parity = [sum(parity[b & m] << i for i, m in enumerate(column_masks)) for b in range(256)]
    return parity, column_parity


_PARITY, _COLUMN_PARITY = _make_ecc_tables()


def ecc_chunk(chunk: bytes) -> bytes:
    """The 3 byte Hamming code the PS2 stores for each 128 byte chunk of a page."""
    column = 0x77
    line0 = 0x7F
    line1 = 0x7F
    for i, b in enumerate(chunk):
        column ^= _COLUMN_PARITY[b]
        if _PARITY[b]:
            line0 ^= ~i
            line1 ^= i
    return bytes((column, line0 & 0x7F, line1))


_ZERO_PAGE_SPARE = ecc_chunk(bytes(128)) * 4 + bytes(4)


def page_spare(page: bytes) -> bytes:
    if not any(page):
        return _ZERO_PAGE_SPARE
    return b''.join(ecc_chunk(page[i:i + 128]) for i in range(0, PAGE_SIZE, 128)) + bytes(4)


def _pack_tod(when: datetime) -> bytes:
    when = when.astimezone(JST)
    return struct.pack('<xBBBBBH', when.second, when.minute, when.hour, when.day, when.month, when.year)


def _pack_dirent(mode, length, when, cluster, parent_entry, name) -> bytes:
    tod = _pack_tod(when)
    return _DIRENT.pack(mode, 0, length, tod, cluster, parent_entry, tod, 0, name.encode('ascii'))


def validate_name(name: str, what: str):
    if not name or len(name) > MAX_NAME_LENGTH:
        raise MemcardError(f"{what} '{name}' must be 1 to {MAX_NAME_LENGTH} characters long.")
    if not all(32 < ord(ch) < 127 for ch in name) or any(ch in name for ch in '/\\?*:"<>|'):
        raise MemcardError(f"{what} '{name}' may only contain ASCII letters, numbers and symbols (no spaces, / \\ ? * : \" < > |).")
    if name in ('.', '..'):
        raise MemcardError(f"{what} can't be '{name}'.")


def create_card(saves: dict, when: datetime = None) -> bytes:
    """
    Format a new 8MB card containing the given saves.
    `saves` maps a save directory name to a list of (filename, bytes) tuples.
    """
    when = when or datetime.now(JST)
    data = bytearray(CLUSTERS_PER_CARD * CLUSTER_SIZE)
    fat = [FAT_FREE] * ALLOCATABLE_CLUSTER_END + [FAT_CHAIN_END] * (FAT_CLUSTER_COUNT * FAT_ENTRIES_PER_CLUSTER - ALLOCATABLE_CLUSTER_END)
    next_free = 0

    def allocate(byte_count):
        """Allocate a chain of clusters big enough for `byte_count` bytes, return the cluster numbers."""
        nonlocal next_free
        count = max(1, -(-byte_count // CLUSTER_SIZE))
        if next_free + count > ALLOCATABLE_CLUSTER_END:
            raise MemcardError("The saves don't fit on an 8MB memory card.")
        chain = list(range(next_free, next_free + count))
        next_free += count
        for a, b in zip(chain, chain[1:]):
            fat[a] = b | FAT_ALLOCATED
        fat[chain[-1]] = FAT_CHAIN_END
        return chain

    def write(chain, content):
        for i, cluster in enumerate(chain):
            chunk = content[i * CLUSTER_SIZE:(i + 1) * CLUSTER_SIZE]
            offset = (ALLOCATABLE_CLUSTER_OFFSET + cluster) * CLUSTER_SIZE
            data[offset:offset + len(chunk)] = chunk

    for dir_name, files in saves.items():
        validate_name(dir_name, 'Save folder name')
        names = [name for name, _ in files]
        for name in names:
            validate_name(name, 'Filename')
        if len(set(n.lower() for n in names)) != len(names):
            raise MemcardError(f"Save '{dir_name}' has duplicate filenames.")
    if len(set(n.lower() for n in saves)) != len(saves):
        raise MemcardError("Save folder names must be unique.")

    # The root directory has to be allocated first so that it starts at allocatable cluster 0.
    root_entry_count = 2 + len(saves)
    root_chain = allocate(root_entry_count * DIRENT_SIZE)
    root = bytearray()
    root += _pack_dirent(MODE_DIR, root_entry_count, when, 0, 0, '.')
    root += _pack_dirent(MODE_DOTDOT, 0, when, 0, 0, '..')

    for index, (dir_name, files) in enumerate(saves.items()):
        entry_count = 2 + len(files)
        dir_chain = allocate(entry_count * DIRENT_SIZE)
        root += _pack_dirent(MODE_DIR, entry_count, when, dir_chain[0], 0, dir_name)

        # "." points back at this directory's entry in the root directory.
        directory = bytearray()
        directory += _pack_dirent(MODE_DIR, 0, when, root_chain[0], 2 + index, '.')
        directory += _pack_dirent(MODE_DOTDOT, 0, when, 0, 0, '..')
        for name, content in files:
            file_chain = allocate(len(content))
            write(file_chain, content)
            directory += _pack_dirent(MODE_FILE, len(content), when, file_chain[0], 0, name)
        write(dir_chain, directory)

    write(root_chain, root)

    # Superblock.
    superblock = bytearray(CLUSTER_SIZE)
    struct.pack_into('<28s12sHHHHLLLLLL', superblock, 0,
                     b'Sony PS2 Memory Card Format ', b'1.2.0.0',
                     PAGE_SIZE, PAGES_PER_CLUSTER, PAGES_PER_ERASE_BLOCK, 0xFF00,
                     CLUSTERS_PER_CARD, ALLOCATABLE_CLUSTER_OFFSET, ALLOCATABLE_CLUSTER_END,
                     0, BACKUP_BLOCK_1, BACKUP_BLOCK_2)
    struct.pack_into('<L', superblock, 0x50, INDIRECT_FAT_CLUSTER)
    superblock[0xD0:0x150] = b'\xff' * 128  # Bad erase block list, none.
    superblock[0x150] = 0x02  # Card type: PS2.
    superblock[0x151] = 0x2B  # Card flags.
    data[0:CLUSTER_SIZE] = superblock

    # Indirect FAT, then the FAT itself.
    indirect = [FIRST_FAT_CLUSTER + i for i in range(FAT_CLUSTER_COUNT)]
    indirect += [FAT_CHAIN_END] * (FAT_ENTRIES_PER_CLUSTER - len(indirect))
    struct.pack_into(f'<{FAT_ENTRIES_PER_CLUSTER}L', data, INDIRECT_FAT_CLUSTER * CLUSTER_SIZE, *indirect)
    struct.pack_into(f'<{len(fat)}L', data, FIRST_FAT_CLUSTER * CLUSTER_SIZE, *fat)

    # Interleave each page with its ECC. The second backup block is left erased (all 0xFF, ECC included) as PCSX2 does.
    out = bytearray(CARD_SIZE)
    erased_from = BACKUP_BLOCK_2 * PAGES_PER_ERASE_BLOCK
    erased_to = erased_from + PAGES_PER_ERASE_BLOCK
    for page in range(CLUSTERS_PER_CARD * PAGES_PER_CLUSTER):
        raw = page * RAW_PAGE_SIZE
        if erased_from <= page < erased_to:
            out[raw:raw + RAW_PAGE_SIZE] = b'\xff' * RAW_PAGE_SIZE
            continue
        content = bytes(data[page * PAGE_SIZE:(page + 1) * PAGE_SIZE])
        out[raw:raw + PAGE_SIZE] = content
        out[raw + PAGE_SIZE:raw + RAW_PAGE_SIZE] = page_spare(content)
    return bytes(out)


def read_card(card: bytes) -> dict:
    """Read every save on a card into {directory name: {filename: bytes}}."""
    if not card.startswith(b'Sony PS2 Memory Card Format'):
        raise MemcardError("Not a PS2 memory card image.")
    page_size, pages_per_cluster = struct.unpack_from('<HH', card, 40)
    clusters_per_card, alloc_offset, _, root_cluster = struct.unpack_from('<4L', card, 48)
    indirect_list = struct.unpack_from('<32L', card, 0x50)
    raw_page_size = page_size + (16 if len(card) > clusters_per_card * pages_per_cluster * page_size else 0)
    cluster_size = page_size * pages_per_cluster
    entries_per_cluster = cluster_size // 4

    def cluster(n):
        return b''.join(card[p * raw_page_size:p * raw_page_size + page_size]
                        for p in range(n * pages_per_cluster, (n + 1) * pages_per_cluster))

    def fat_entry(n):
        fat_index, offset = divmod(n, entries_per_cluster)
        indirect_index, indirect_offset = divmod(fat_index, entries_per_cluster)
        fat_cluster = struct.unpack_from('<L', cluster(indirect_list[indirect_index]), indirect_offset * 4)[0]
        return struct.unpack_from('<L', cluster(fat_cluster), offset * 4)[0]

    def read_chain(first, length):
        out = bytearray()
        n = first
        while len(out) < length:
            out += cluster(alloc_offset + n)
            entry = fat_entry(n)
            if entry == FAT_CHAIN_END:
                break
            if not entry & FAT_ALLOCATED:
                raise MemcardError(f"Cluster chain from {first} reaches unallocated cluster {n}.")
            n = entry & ~FAT_ALLOCATED
        if len(out) < length:
            raise MemcardError(f"Cluster chain from {first} is shorter than {length} bytes.")
        return bytes(out[:length])

    def read_dir(first, count):
        content = read_chain(first, count * DIRENT_SIZE)
        entries = []
        for i in range(count):
            mode, _, length, _, first_cluster, _, _, _, name = _DIRENT.unpack_from(content, i * DIRENT_SIZE)
            entries.append((mode, length, first_cluster, name.split(b'\0')[0].decode('ascii')))
        return entries

    root_count = _DIRENT.unpack_from(read_chain(root_cluster, DIRENT_SIZE), 0)[2]
    saves = {}
    for mode, length, first, name in read_dir(root_cluster, root_count)[2:]:
        if (mode & (DF_EXISTS | DF_DIR)) != (DF_EXISTS | DF_DIR):
            continue
        files = {}
        for file_mode, file_length, file_first, file_name in read_dir(first, length)[2:]:
            if (file_mode & (DF_EXISTS | DF_FILE)) == (DF_EXISTS | DF_FILE):
                files[file_name] = read_chain(file_first, file_length)
        saves[name] = files
    return saves
