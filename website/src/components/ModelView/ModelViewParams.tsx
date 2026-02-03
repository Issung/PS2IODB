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

/** The background display type. */
export enum BackgroundType {
    /** Display the background colors from the data stored with the icon, if available. */
    Icon = 'Icon',
    /** Display a solid color of the user's choice. */
    Color = 'Color',
}

/** The base/floor display type shown beneath the model. */
export enum BaseType {
    /** Display a radial shadow that fades to transparency. */
    Shadow = 'Shadow',
    /** Display a grid with axes helper. */
    Grid = 'Grid',
    /** Display nothing beneath the model. */
    None = 'None',
}