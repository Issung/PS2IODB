import re
import pytest

games = []

with open('website/src/GameList.tsx', 'r', encoding='utf8') as file:
    index = 0
    for line in file:
        if line.startswith('    new Game(`'):
            matches = re.findall(r'new Game\(`(.*?)`(?:, `(.*?)`, (\d+))?\)', line)
            fields = list(filter(lambda x: len(x) > 0, matches[0]))
            if len(fields) >= 3:
                fields[2] = int(fields[2])
            games.append(fields)
        #else:
        #    print(f"line {index} didnt start with expected prefix: {line}")
        index += 1

def test_length():
    """
        Assert the total length of the library is as expected.
    """
    assert len(games) == 4373

def test_all_titles_with_code_also_have_icon_count():
    """
        Assert that all titles listed either have 1 or 3 columns of data.
        This means either having just the title.
        Or having the title, code and iconcount, essentially requiring that if the code is set then the iconcount must be too.
    """
    for index in range(0, len(games)):
        game = games[index]
        assert len(game) == 1 or len(game) == 3

@pytest.mark.parametrize("index, expected_name, expected_code, expected_icon_count", [
    (0, '¡Qué pasa Neng! El videojuego', None, None),
    (-1, 'Zwei: The Arges Adventure', None, None),
    (752, "Devil May Cry 3: Dante's Awakening", 'devilmaycry3', 3),
    (1283, 'God of War', 'godofwar', 1),
    #(-1, 'Test 1', 'tet', None),
    #(-1, 'Test 2', None, 'tet'),
])
def test_indexes(index, expected_name, expected_code, expected_icon_count):
    """
        Test that games at given indexes have the expected data.
    """

    # Assert the test case is valid.
    assert \
        (expected_code == None and expected_icon_count == None) or \
        (expected_code != None and expected_icon_count != None)
    
    # Get the game by the index.
    game = games[index]

    assert game[0] == expected_name

    if expected_code == None and expected_icon_count == None:
        assert len(game) == 1

    if expected_code:
        assert game[1] == expected_code
        assert len(game) == 3

    if expected_code:
        assert game[2] == expected_icon_count
        assert len(game) == 3

