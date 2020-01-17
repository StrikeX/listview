export function canScrollToItem(index: number, range: IRange, heights: IHeights): boolean {
    /**
     * Расчет возможности подскроллить к элементу, если к элементу невозможно подскроллить то необходимо пересчитать
     * индексы от этого элемента
     */
    return result;
}

export function getActiveElementIndex(range: IRange, heights: IHeights): number {
    /**
     * Расчет активного элемента
     */
    if (isScrolledToBottom()) {
        return range.stop - 1;
    } else if (isScrolledToTop()) {
        return range.start;
    } else {
        let
    }
}