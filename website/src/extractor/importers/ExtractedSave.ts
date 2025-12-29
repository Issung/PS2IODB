import { PS2Icon } from "../ps2icon";
import { IconSysData } from "../ps2iconsys";

/**
 * Information about a parsed save with icon data.
 */
export interface ExtractedSave {
    directoryName: string;
    title: string;
    iconSys: IconSysData | null;
    icons: Map<string, PS2Icon>;
}
