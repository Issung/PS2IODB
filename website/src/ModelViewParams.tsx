// These have to be in a separate file otherwise a circular dependency occurs and the error isn't very clear at all.

export enum TextureType {
    Icon = 'Default',
    Test = 'Test Map',
    Plain = 'Plain',
}

export enum MeshType {
    Mesh = 'Mesh',
    Wireframe = 'Wireframe',
    Normals = 'Normals',
}