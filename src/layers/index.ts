import Utils from '../utils'

import Tile3dLayerer from './tile3d'
import TileLayerer from './tile'
import ClampedLayerer from './clamped'
import VectorLayerer from './vector'
import CurtainLayerer from './curtain'
import ModelLayerer from './model'

interface Private {
    layerers: {
        tile3d: Tile3dLayerer
        tile: TileLayerer
        clamped: ClampedLayerer
        vector: VectorLayerer
        curtain: CurtainLayerer
        model: ModelLayerer
    }
}

export default class Layers {
    _: Private
    // parent
    p: any
    tile3d: any
    tile: any
    clamped: any
    vector: any
    curtain: any
    model: any
    all: any

    constructor(parent: any) {
        this.p = parent
        this._ = {
            layerers: {
                tile3d: new Tile3dLayerer(this),
                tile: new TileLayerer(this),
                clamped: new ClampedLayerer(this),
                vector: new VectorLayerer(this),
                curtain: new CurtainLayerer(this),
                model: new ModelLayerer(this),
            },
        }
        this._reset()
    }

    _reset(): void {
        this.tile3d = []
        this.tile = []
        this.clamped = []
        this.vector = []
        this.curtain = []
        this.model = []

        // For convenience
        // The order here is also used by the layers control
        this.all = {
            tile3d: this.tile3d,
            tile: this.tile,
            clamped: this.clamped,
            vector: this.vector,
            curtain: this.curtain,
            model: this.model,
        }
    }

    // sI is scene Index
    // TODO layerObj type
    addLayer = (
        type: string,
        layerObj: any,
        callback?: Function,
        sI?: number
    ): void => {
        //if (sI == undefined) sI = 0

        // Support 1/0 on params
        if (layerObj.on == 1) layerObj.on = true
        else if (layerObj.on == 0) layerObj.on = false

        layerObj._type = type

        if (layerObj.order?.length != null) {
            layerObj.order = this.getDesiredOrder(
                layerObj.name,
                type,
                layerObj.order
            )
        }
        if (layerObj.order == null) layerObj.order = this.all[type].length

        if (this._.layerers[type]) this._.layerers[type].add(layerObj, callback)
        else console.warn(`Cannot add unknown layer type ${type}.`)
    }

    removeLayer = (name: string): boolean => {
        let foundMatch = false

        for (const type in this._.layerers) {
            const didRemove = this._.layerers[type].remove(name)
            if (didRemove) foundMatch = true
        }
        if (!foundMatch) {
            // console.warn(`Could not find a layer named '${name}' to remove.`)
            return false
        }
        return true
    }

    // if on unset, on state flips
    toggleLayer = (name: string, on?: boolean): boolean => {
        let foundMatch = false

        for (const type in this._.layerers) {
            const didToggle = this._.layerers[type].toggle(name, on)
            if (didToggle) foundMatch = true
        }
        if (!foundMatch) {
            // console.warn(`Could not find a layer named '${name}' to toggle.`)
            return false
        }
        return true
    }

    // Takes an array of layer names and does its best to order them
    // Layer names that come first are on top of all later layers
    // Ultimately only clamped and tile layers get ordered and clamped layers
    // are always on top of tile layers
    // Clamped and tile layers not listed go to the bottom
    orderLayers = (ordering: string[]): boolean => {
        const orderingTyped = {}

        ordering.forEach((name) => {
            const layer = this.getLayerByName(name)
            if (layer && layer._type) {
                if (orderingTyped[layer._type] == null)
                    orderingTyped[layer._type] = []
                orderingTyped[layer._type].push(name)
            }
        })

        let hit = false
        for (const type in orderingTyped) {
            if (typeof this._.layerers[type].orderLayers === 'function') {
                this._.layerers[type].orderLayers(orderingTyped[type])
                hit = true
            }
        }

        // A more expensive option so make sure it's needed
        if (hit) {
            this.p._.tiledWorld.removeAllTiles()
        }

        return true
    }

    private getDesiredOrder = (
        name: string,
        type: string,
        ordering: string[]
    ): number => {
        const orderingTyped = {}

        ordering.forEach((layerName, idx) => {
            const layer = this.getLayerByName(layerName)
            if (layer && layer._type) {
                if (orderingTyped[layer._type] == null)
                    orderingTyped[layer._type] = []
                orderingTyped[layer._type].push({
                    name: layer.name,
                    order: layer.order,
                    index: idx,
                })
            }
        })

        if (orderingTyped[type]) {
            const index = ordering.indexOf(name)
            let desiredOrder = 0
            for (let i = 0; i < orderingTyped[type].length; i++) {
                if (index > orderingTyped[type][i].index) {
                    if (i == orderingTyped[type].length - 1)
                        desiredOrder = orderingTyped[type][i].index + 1
                    else
                        desiredOrder =
                            (orderingTyped[type][i].order +
                                orderingTyped[type][i + 1].order) /
                            2
                    return desiredOrder
                }
            }

            // Then we have a lower index (higher order) than everything else
            if (orderingTyped[type].length > 0)
                return orderingTyped[type][0].order + 1
        }

        // Default to index position
        if (ordering.includes(name))
            return ordering.length - ordering.indexOf(name) - 1

        // Should never get here if functions are used properly
        return 0
    }

    setLayerOpacity = (name: string, opacity: number): boolean => {
        let foundMatch = false

        for (const type in this._.layerers) {
            const didOpacity = this._.layerers[type].setOpacity(
                name,
                // @ts-ignore
                parseFloat(opacity)
            )
            if (didOpacity) foundMatch = true
        }
        if (!foundMatch) {
            // console.warn(`Could not find a layer named '${name}' to set the opacity of.`)
            return false
        }
        return true
    }

    setLayerFilterEffect = (
        name: string,
        filter: string,
        value: number
    ): boolean => {
        const allowableFilterEffects = [
            'brightness',
            'contrast',
            'saturation',
            'blendCode',
        ]
        if (!allowableFilterEffects.includes(filter)) {
            console.warn(
                `Filter ${filter} must be one of: ${allowableFilterEffects.toString()}.`
            )
            return false
        }

        const didFilter = this._.layerers.tile.setFilterEffect(
            name,
            filter,
            // @ts-ignore
            parseFloat(value)
        )
        if (!didFilter) {
            // console.warn(`Could not find tile layer named '${name}' to set the filter of.`)
            return false
        }
        return true
    }

    setLayerSpecificOptions = (name: string, options: any): boolean => {
        let foundMatch = false

        for (const type in this._.layerers) {
            if (
                typeof this._.layerers[type].setLayerSpecificOptions ===
                'function'
            ) {
                const didOptions = this._.layerers[
                    type
                ].setLayerSpecificOptions(name, options)
                if (didOptions) foundMatch = true
            }
        }
        if (!foundMatch) {
            return false
        }
        return true
    }

    // Helper
    findHighestMaxZoom = (): number => {
        let highest = 0
        for (const l in this.tile) {
            if (this.tile[l].on)
                if (this.tile[l].maxZoom > highest) {
                    highest = this.tile[l].maxZoom
                }
        }
        return highest
    }

    findLowestMinZoom = (): number => {
        let lowest = Infinity
        for (const l in this.tile) {
            if (this.tile[l].on)
                if (this.tile[l].minZoom < lowest) {
                    lowest = this.tile[l].minZoom
                }
        }
        return lowest
    }

    getLayerByName = (layerName: string): any => {
        for (const type in this.all) {
            for (let i = 0; i < this.all[type].length; i++) {
                if (this.all[type][i].name === layerName)
                    return this.all[type][i]
            }
        }
        return null
    }

    hasLayer = (layerName: string): boolean => {
        return this.getLayerByName(layerName) != null
    }

    private getFeatureStyleProp = (value: any, feature: any) => {
        if (value != null && typeof value === 'string' && value.includes('=')) {
            let propValue = null
            // Then they're setting the value based a property's value of the feature.
            // i.e. prop=path.to.my.properties.key
            const split = value.split('=')

            propValue = Utils.getIn(feature.properties, split[1].split('.'))
            return propValue
        } else {
            return value
        }
    }

    private getBaseStyle = (
        feature?: any,
        type?: string,
        geomType?: string
    ) => {
        const baseStyle: any = {
            fillColor: 'rgb(0,0,0)',
            fillOpacity: 0.4,
            color: 'rgb(255,255,255)',
            weight: 2,
            radius: 6,
        }

        if (feature?.properties?.annotation === true) {
            baseStyle.fontSize = '16px'
            baseStyle.rotation = 0
            baseStyle.fillOpacity = 1
        }
        if (type === 'vector' && geomType === 'point') {
            baseStyle.elevOffset = 20
        }
        if (type === 'vector' || type === 'clamped') {
            baseStyle.minZoom = null
            baseStyle.maxZoom = null
        }

        return baseStyle
    }

    // Computes a feature's style given it layer styling configuration
    // Does fancy things like letting you set style from properties and by properties
    getFeatureStyle = (layer: any, feature: any, isStrokeless?: boolean) => {
        // Set as base
        const geomType = feature.geometry.type.toLowerCase()
        const style = this.getBaseStyle(feature, layer._type, geomType)
        if (layer.style) {
            for (const key in style) {
                // Set as default
                if (layer.style.default && layer.style.default[key] != null) {
                    const defaultOverride = this.getFeatureStyleProp(
                        layer.style.default[key],
                        feature
                    )
                    style[key] =
                        defaultOverride != null ? defaultOverride : style[key]
                }

                // Then override by geometry type
                if (geomType === 'point' && layer.style.point) {
                    const pointOverride = this.getFeatureStyleProp(
                        layer.style.point[key],
                        feature
                    )
                    style[key] =
                        pointOverride != null ? pointOverride : style[key]
                } else if (geomType === 'linestring' && layer.style.line) {
                    const lineOverride = this.getFeatureStyleProp(
                        layer.style.line[key],
                        feature
                    )
                    style[key] =
                        lineOverride != null ? lineOverride : style[key]
                } else if (geomType === 'polygon' && layer.style.polygon) {
                    const polygonOverride = this.getFeatureStyleProp(
                        layer.style.polygon[key],
                        feature
                    )
                    style[key] =
                        polygonOverride != null ? polygonOverride : style[key]
                }

                // Then override by byProp
                if (layer.style.byProp) {
                    // ex. prop=images.0.test:blue
                    for (const propPath in layer.style.byProp) {
                        const path = propPath.split(':')[0].split('=')[1]
                        const value = propPath.split(':')[1]
                        if (
                            Utils.getIn(feature.properties, path.split('.')) ==
                            value
                        ) {
                            const propOverride = this.getFeatureStyleProp(
                                layer.style.byProp[propPath][key],
                                feature
                            )
                            style[key] =
                                propOverride != null ? propOverride : style[key]
                        }
                    }
                }

                // Use the properties.style object if one's set on the feature
                if (layer.style.letPropertiesStyleOverride === true) {
                    const styleOverride = Utils.getIn(
                        feature.properties?.style,
                        key
                    )
                    style[key] =
                        styleOverride != null ? styleOverride : style[key]
                }
            }
        }

        // Final format
        if (style.fillColor === 'none') style.fillColor = 'rgba(0,0,0,0)'

        const type = feature.geometry?.type
            ? feature.geometry.type.toLowerCase()
            : ''

        // Active && Highlights
        if (feature._active) {
            if (
                this.p.options.canBecomeActive !== false &&
                layer.canBecomeActive !== false &&
                (layer.style[type] == null ||
                    (layer.style[type] &&
                        layer.style[type].canBecomeActive !== false))
            )
                style.fillColor = this.p.options.activeColor || 'red'
        } else if (feature._highlighted) {
            if (
                this.p.options.canBecomeHighlighted !== false &&
                layer.canBecomeHighlighted !== false &&
                (layer.style[type] == null ||
                    (layer.style[type] &&
                        layer.style[type].canBecomeHighlighted !== false))
            )
                style.fillColor = this.p.options.highlightColor || 'yellow'
        }

        // For lines and what not
        if (isStrokeless === true) {
            style.color = style.fillColor
        }

        return style
    }

    _onMouseMove = (
        intersectedLL,
        e: MouseEvent,
        obj,
        intersectionRaw,
        intersectionPoint
    ) => {
        if (obj.layerType && this[obj.layerType]) {
            const layers = this[obj.layerType]
            for (const l in layers) {
                if (obj.parent?.uuid === layers[l].curtain.uuid)
                    if (typeof layers[l].onMouseMove === 'function')
                        layers[l].onMouseMove(
                            e,
                            layers[l],
                            obj,
                            intersectionRaw,
                            intersectedLL,
                            intersectionPoint
                        )
            }
        }
    }
}
