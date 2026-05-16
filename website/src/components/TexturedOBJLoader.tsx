import { FileLoader, Group } from 'three';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

/**
 * Custom extension of OBJLoader that can load a given texture url or load the mtl 
 * file specified inside the obj file.
 */
export class TexturedOBJLoader extends OBJLoader 
{
    /**
     * New load function, use this one and no others.
     * @param objUrl Url of the obj file.
     * @param textureUrl Set a custom texture to load, if undefined then will load mtl file specified in obj file.
     * @param onProgress
     * @param onMtlTextureFileUrlFound An event fired when the 'mtllib' line of the obj file is loaded, containing the relative url of the texture file.
     * @param onError
     * @param onLoadComplete
     */
    loadV2(
        objUrl: string,
        textureUrl: string | undefined,
        onProgress?: (event: ProgressEvent) => void,
        onMtlTextureFileUrlFound?: (event: string) => void,
        onError?: (event: unknown) => void,
        onLoadComplete?: (group: Group) => void,
    ): void 
    {
        const scope = this;
        const loader = new FileLoader(this.manager);
        loader.setPath(this.path);
        loader.setRequestHeader(this.requestHeader);
        loader.setWithCredentials(this.withCredentials);
        loader.load(objUrl, text => 
        {
            try 
            {
                if (text instanceof ArrayBuffer) 
                {
                    const arrayBufferView = new Uint8Array(text);
                    text = new TextDecoder().decode(arrayBufferView);
                }

                let relativeMtlUrl = undefined;
                if (onMtlTextureFileUrlFound)
                {
                    relativeMtlUrl = this.getRelativeMtlUrl(objUrl, text);
                    onMtlTextureFileUrlFound(relativeMtlUrl);
                }

                let mtlFileUrl = textureUrl ? this.createBlobMtlForUrl(textureUrl) : (relativeMtlUrl ?? this.getRelativeMtlUrl(objUrl, text));

                scope.loadMtl(
                    mtlFileUrl,
                    () => 
                    {
                        let group = scope.parse(text as string);
                        if (onLoadComplete) {
                            onLoadComplete(group);
                        }
                    },
                    onProgress,
                    onError
                );
            }
            catch (e) 
            {
                if (onError) 
                {
                    onError(e as ErrorEvent);
                }
                else 
                {
                    console.error(e);
                }

                scope.manager.itemError(objUrl);
            }
        }, onProgress, onError);
    }

    loadMtl(
        mtlFileUrl: string,
        onLoadComplete: () => void,
        onProgress?: (event: ProgressEvent) => void,
        onError?: (event: unknown) => void,
        resourcePath?: string
    ): void
    {
        const mtlLoader = new MTLLoader(this.manager);

        // If a resource path is provided, use it. This is important for blob URLs
        // where the texture URLs inside the MTL are already absolute blob URLs.
        // Setting resourcePath to '' prevents MTLLoader from prepending its base path.
        if (resourcePath !== undefined) {
            mtlLoader.setResourcePath(resourcePath);
        }

        mtlLoader.load(
            mtlFileUrl,
            materials => {
                this.setMaterials(materials);
                onLoadComplete();
            },
            onProgress,
            onError
        );
    }

    /**
     * Extracts mtllib line from objFileContents and converts the filename to a
     * relative url e.g. '0.mtl' -> '/icons/gamecode/0.mtl'.
     * @param objUrl URL of the obj file.
     * @param objFileContents Text content of the obj file.
     * @returns Relative URL of the mtl file specified in the obj file.
     */
    getRelativeMtlUrl(objUrl: string, objFileContents: string): string
    {
        const mtllibLineStart = 'mtllib ';
        const lines = objFileContents.split('\n');
        let mtllibLine = lines.find(l => l.startsWith(mtllibLineStart))

        if (!mtllibLine)
        {
            throw new Error("No mtllib line found in obj file.");
        }

        let mtlFilename = mtllibLine?.substring(mtllibLineStart.length).trim();

        if (!mtlFilename)
        {
            throw new Error("Could not find mtl filename in obj file contents.");
        }

        const urlParts = objUrl.split("/");
        urlParts.pop(); // Remove the last part (filename)
        urlParts.push(this.urlEncode(mtlFilename)); // Add the new filename
        const mtlFileUrl = urlParts.join("/");
        return mtlFileUrl;
    }

    /**
     * Since we can't access MTLLoader.MaterialCreator directly for whatever reason 
     * @param textureUrl An absolute texture url, e.g. 'https://test.com/image.jpg'
     * @returns Blob url for a mtl file that points to textureUrl.
     */
    createBlobMtlForUrl(textureUrl: string): string 
    {
        const textContent = `newmtl Texture\nmap_Kd ${textureUrl}`;
        const blob = new Blob([textContent], { type: 'text/plain' });
        const blobUrl = URL.createObjectURL(blob);
        return blobUrl;
    }

    /**
     * Url encode a string, but only spaces for now.
     * Rayman 2 has semicolons in the filenames and they need to be accessed
     * without URL encoding for some reason.
     */
    urlEncode(str: string) {
        return str.replace(/ /g, '%20');
    }

    /**
     * Load a model from OBJ content string and MTL blob URL.
     * Used for file-based loading where the MTL has already been rewritten
     * to use blob URLs for textures.
     * @param objContent The OBJ file content as a string.
     * @param mtlBlobUrl Blob URL for the MTL file (with texture references already rewritten).
     * @param onLoadComplete Callback when model is loaded.
     * @param onError Error callback.
     */
    loadFromContent(
        objContent: string,
        mtlBlobUrl: string,
        onLoadComplete: (group: Group) => void,
        onError?: (event: unknown) => void
    ): void {
        const scope = this;

        // Pass empty string as resourcePath because the texture URLs in the MTL
        // are already absolute blob URLs. This prevents MTLLoader from prepending
        // its base path to them (which would cause "blob:blob:" double-prefix errors).
        this.loadMtl(
            mtlBlobUrl,
            () => {
                try {
                    const group = scope.parse(objContent);
                    onLoadComplete(group);
                } catch (e) {
                    if (onError) {
                        onError(e);
                    } else {
                        console.error(e);
                    }
                }
            },
            undefined,
            onError,
            '' // Empty resource path for blob URLs with absolute texture paths
        );
    }
}
