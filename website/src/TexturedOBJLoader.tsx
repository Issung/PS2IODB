import { FileLoader, Group } from 'three';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';

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
        onError?: (event: ErrorEvent) => void,
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
        onError?: (event: ErrorEvent) => void
    ): void 
    {
        const mtlLoader = new MTLLoader(this.manager);
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
        const lines = objFileContents.split('\n');
        let mtlFilename = lines.find(l => l.startsWith('mtllib'))?.split(' ')[1];

        if (!mtlFilename)
        {
            throw new Error("Could not find mtl filename in obj file contents.");
        }

        const urlParts = objUrl.split("/");
        urlParts.pop(); // Remove the last part (filename)
        urlParts.push(mtlFilename); // Add the new filename
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
}
