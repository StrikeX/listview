interface IHeights {
    viewport: number;
    items: number[];
    itemsOffsets: number[];
    scrollTop: number;
    itemsContainer: number;
    trigger: number;
}

/**
 * Расчет видимых индексов от переданного индекса
 * @remark
 * Вызывается при инциализации виртуального скролла
 * @param index
 * @param pageSize
 * @param itemsCount
 */
export function getRangeByIndex(index: number, pageSize: number, itemsCount: number): IRange {
    let start, stop;

    if (pageSize < itemsCount) {
        start = index;
        stop = start + pageSize;

        if (stop >= itemsCount) {
            stop = itemsCount;
            start = stop - pageSize;
        }
    } else {
        start = 0;
        stop = itemsCount;
    }

    return {
        start, stop
    }
}

export function getRangeByItemHeightProperty(index: number, heights: IHeights): IRange {
    let sumHeight = 0;
    let stop: number;

    for (let i = index; i < this.itemsCount; i++) {
        const itemHeight = heights.items[i];
        if (sumHeight + itemHeight <= heights.viewport) {
            sumHeight += itemHeight;
        } else {
            stop = i;
            break;
        }
    }

    /**
     * @remark Так как списки итерируются пока i < stopIndex, то нужно добавить 1
     * @example items: [{height: 20, ...}, {height: 40, ...}, {height: 50, ...}], itemHeightProperty: 'height'
     * viewportHeight: 70
     * Если бы мы не добавили единицу, то получили бы startIndex = 0 и stopIndex = 2, но так как итерируюется
     * пока i < stopIndex, то мы получим не три отрисованных элемента, а 2
     */
    return {
        start: index,
        stop: stop + 1
    }
}

export function getRangeByDirection(
    direction: IDirection,
    range: IRange,
    segmentSize: number,
    heights: IHeights,
    itemsCount: number,
    shouldLoad: boolean = true
): {
    range: IRange, needToLoad: boolean
} {
    let start = range.start;
    let stop = range.stop;
    let needToLoadMore: boolean = false;

    if (start === 0 && direction === 'up' || stop === this.itemsCount && direction === 'down') {
        needToLoadMore = true;
    } else {
        const quantity = getItemsToHideQuantity(direction, heights);

        if (direction === 'up') {
            if (start <= segmentSize) {
                needToLoadMore = true;
            }

            start = Math.max(0, start - segmentSize);
            stop -= quantity;
        } else {
            if (stop + segmentSize >= itemsCount) {
                needToLoadMore = true;
            }

            stop = Math.min(stop + segmentSize, itemsCount);
            start += quantity;
        }

        this.checkIndexesChanged(start, stop, direction);
    }

    return {
        needToLoad: needToLoadMore && shouldLoad, range: {start, stop}
    }
    // TODO в этом методе нужно рассчитывать необходимо ли производить догрузку данных
}

export function getRangeByScrollTop(heights: IHeights, pageSize: number, itemsCount: number): IRange {
    const scrollTop = heights.scrollTop;
    let start = 0, stop;
    let tempPlaceholderSize = 0;
    while (tempPlaceholderSize + heights.items[start] <= scrollTop - heights.trigger) {
        tempPlaceholderSize += heights.items[start];
        start++;
    }

    start = Math.max(start - (Math.trunc(pageSize / 2)), 0);
    stop = Math.min(start + pageSize, itemsCount);

    // Если мы скроллим быстро к концу списка, startIndex может вычислиться такой,
    // что число отрисовываемых записей будет меньше virtualPageSize (например если
    // в списке из 100 записей по scrollTop вычисляется startIndex == 95, то stopIndex
    // будет равен 100 при любом virtualPageSize >= 5.
    // Нам нужно всегда рендерить virtualPageSize записей, если это возможно, т. е. когда
    // в коллекции достаточно записей. Поэтому если мы находимся в конце списка, пробуем
    // отодвинуть startIndex назад так, чтобы отрисовывалось нужное число записей.
    if (stop === itemsCount) {
        const missingCount = pageSize - (stop - start);
        if (missingCount > 0) {
            start = Math.max(start - missingCount, 0);
        }
    }

    return {start, stop};
}

/**
 * Рассчитывает сколько элементов нужно скрыть
 * @remark Оставляем элементов с запасом на 2 вьюпорта для плавного скроллинга
 */
function getItemsToHideQuantity(direction: string, heights: IHeights): number {
    if (direction === 'up') {
        return getItemsToHideQuantityToUp(heights);
    } else {
        return getItemsToHideQuantityToDown(heights);
    }
}

/**
 * Рассчитывает сколько элементов нужно скрыть сверху
 */
function getItemsToHideQuantityToUp(): number {

}

/**
 * Рассчитывает сколько элементов нужно скрыть сверху
 */
function getItemsToHideQuantityToDown(): number {

}