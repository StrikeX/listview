interface IHeights {
    viewport: number;
    items: number[];
    scrollTop: number;
    itemsContainer: number;
    trigger: number;
}

export function recalcFromIndex(index: number, pageSize: number, itemsCount): IRange {
    /**
     * расчет от индекса за счет pageSize
     */
    return {
        start, stop
    }
}

export function recalcFromItemHeightProperty(index: number, heights: IHeights): IRange {
    /**
     * Расчет индексов от примерных высот
     */
    return {
        start, stop
    }
}

export function recalcToDirection(direction: IDirection, range: IRange, segmentSize: number, heights: IHeights): IRange {
    /**
     * Расчет индексов по направлению
     */
    return {
        start, stop
    }
    // TODO в этом методе нужно рассчитывать необходимо ли производить догрузку данных
}

export function recalcFromScrollTop(heights: IHeights): IRange {
    /**
     * Расчет индексов от высоты скролла
     */
    return {
        start, stop
    }
}