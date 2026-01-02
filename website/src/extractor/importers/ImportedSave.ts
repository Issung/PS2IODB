import { IconSys } from "../../model/IconSys";
import { PS2Icon } from "../ps2icon";

/**
 * Information about a parsed save with icon data.
 */
export interface ImportedSave {
    iconSys: IconSys | null;
    icons: Map<string, PS2Icon>;
}
