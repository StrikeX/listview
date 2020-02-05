import {
    IRange,
    IContainerHeights,
    IDirection,
    IItemsHeights,
    IVirtualScrollOptions, IPlaceholders
} from "./interfaces";

export default class VirtualScroll {
    private _containerHeightsData: IContainerHeights = {scroll: 0, trigger: 0, viewport: 0};
    private _options: IVirtualScrollOptions;
    private _itemsHeightData: IItemsHeights = {itemsHeights: [], itemsOffsets: []};
    private _range: IRange = {start: 0, stop: 0};
    private _oldRange: IRange = {start: 0, stop: 0};
    private _savedDirection: IDirection;
    private _savedScrollIndex: number;

    rangeChanged: boolean;

    get isNeedToRestorePosition() {
        return this._savedDirection || this._savedScrollIndex;
    }

    get range() {
        return this._range;
    }

    get itemsHeightsData() {
        return this._itemsHeightData;
    }

    constructor(
        options: Partial<IVirtualScrollOptions>,
        containerData: Partial<IContainerHeights>
    ) {
        this.setOptions(options);
        this.applyContainerHeightsData(containerData);
    }

    setOptions(options: Partial<IVirtualScrollOptions>): void {
        this._options = {...this._options, ...options};
    }

    applyContainerHeightsData(containerData: Partial<IContainerHeights>): void {
        this._containerHeightsData = {...this._containerHeightsData, ...containerData};
    }

    /**
     * Создает новый диапазон видимых индексов
     * @remark Используется при инициализации
     * @param startIndex Начальный индекс создаваемого диапазона
     * @param itemsCount Общее количество элементов
     * @param itemsHeights Высоты элементов
     */
    resetRange(startIndex: number, itemsCount: number, itemsHeights?: Partial<IItemsHeights>): IRange {
        this._savedScrollIndex = startIndex;

        if (itemsHeights) {
            this.updateItems(itemsHeights);

            return this._createRangeByItemHeightProperty(startIndex, itemsCount);
        } else {
            return this._createRangeByIndex(startIndex, itemsCount);
        }
    }

    /**
     * Рассчет видимых индексов от позиции скролла
     * @remark
     * Вызывается при смещении скролла за счет движения скроллбара
     */
    shiftRangeToScrollPosition(virtualScrollPosition: number): IRange {
        const itemsHeights = this._itemsHeightData.itemsHeights;
        const pageSize = this._options.pageSize;
        const itemsCount = itemsHeights.length;
        const triggerHeight = this._containerHeightsData.trigger;

        let start = 0, stop;
        let tempPlaceholderSize = 0;

        while (tempPlaceholderSize + itemsHeights[start] <= virtualScrollPosition - triggerHeight) {
            tempPlaceholderSize += itemsHeights[start];
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

        return this._setRange({start, stop});
    }

    /**
     * Производит смещение диапазона за счет добавления новых элементов
     * @param addIndex индекс начиная с которого происходит вставка элементов
     * @param count количество вставляемых элементов
     */
    insertItems(addIndex: number, count: number): IRange {
        const direction = addIndex >= this._range.start ? 'up' : 'down';
        this._insertItemHeights(addIndex, count);

        if (direction === 'up') {
            this._updateStartIndex(this._range.start + count, this._itemsHeightData.itemsHeights.length);
        }

        return this._setRange(this._shiftRangeBySegment(direction, count));
    }

    /**
     * Производит смещение диапазона за счет удаления элементов
     * @param removeIndex индекс начиная с которого происходит удаление элементов
     * @param count количество удаляемых элементов
     */
    removeItems(removeIndex: number, count: number): IRange {
        const direction = removeIndex < this._range.start ? 'up' : 'down';
        this._removeItemHeights(removeIndex, count);

        return this._setRange(this._shiftRangeBySegment(direction, count));
    }

    /**
     * Производит смещение диапазона по направлению на segmentSize
     * @param direction
     */
    shiftRange(direction: IDirection): IRange {
        this._oldRange = this._range;
        this._savedDirection = direction;
        const itemsHeightsData = this._itemsHeightData;
        const itemsCount = itemsHeightsData.itemsHeights.length;
        const segmentSize = this._options.segmentSize;
        let {start, stop} = this._range;

        if (segmentSize) {
            const quantity = VirtualScroll.getItemsToHideQuantity(direction, this._range, this._containerHeightsData, itemsHeightsData);

            if (direction === 'up') {
                start = Math.max(0, start - segmentSize);
                stop -= quantity;
            } else {
                stop = Math.min(stop + segmentSize, itemsCount);
                start += quantity;
            }
        } else {
            start = 0;
            stop = itemsCount;
        }

        return this._setRange({start, stop});
    }

    /**
     * Запоминает данные из ресайза вьюпорта на инстанс
     * @param viewportHeight
     * @param itemsHeights
     */
    resizeViewport(viewportHeight: number, itemsHeights: IItemsHeights): void {
        this.applyContainerHeightsData({viewport: viewportHeight});
        this.updateItems(itemsHeights);
    }

    /**
     * Запоминает данные из ресайза вью на инстанс
     * @param viewHeight
     * @param itemsHeights
     */
    resizeView(viewHeight: number, itemsHeights: IItemsHeights): void {
        this.applyContainerHeightsData({scroll: viewHeight});
        this.updateItems(itemsHeights);
    }

    /**
     * Запоминает позицию триггера после ресайза
     * @param triggerHeight
     */
    resizeTrigger(triggerHeight: number): void {
        this.applyContainerHeightsData({trigger: triggerHeight});
    }

    /**
     * Обновляет данные об элементах
     * @param itemsHeightsData
     */
    updateItems(itemsHeightsData: Partial<IItemsHeights>): void {
        this.rangeChanged = false;
        this._itemsHeightData = {...this._itemsHeightData, ...itemsHeightsData};
    }

    /**
     * Возвращает восстановленную позицию скролла по направлению
     * @param scrollTop
     */
    getPositionToRestore(scrollTop: number): number {
        const itemsOffsets = this._itemsHeightData.itemsOffsets;
        const itemsHeights = this._itemsHeightData.itemsHeights;
        let savedPosition: number;

        if (this._savedDirection) {
            savedPosition = this._savedDirection === 'up' ?
                scrollTop + this._getItemsHeightsSum(this._range.start, this._oldRange.start, itemsHeights) :
                scrollTop - this._getItemsHeightsSum(this._oldRange.start, this._range.start, itemsHeights);
        } else if (this._savedScrollIndex) {
            savedPosition = itemsOffsets[this._savedScrollIndex];
        }

        this._savedDirection = this._savedScrollIndex = null;

        return savedPosition;
    }

    /**
     * Проверяет наличие элемента в диапазоне по его индексу
     * @param itemIndex
     */
    isItemInRange(itemIndex: number): boolean {
        return this._range.start >= itemIndex && this._range.stop <= itemIndex;
    }

    canScrollToItem(itemIndex: number): boolean {
        // Рассчет возможности подскроллить к активному элементу
    }

    getActiveElementIndex(scrollTop: number): number {
        // Рассчет активного элемента исходя из текущего scrollTop
    }

    getPlaceholders(): IPlaceholders {
        return {
            top: this._getItemsHeightsSum(0, this._range.start, this._itemsHeightData.itemsHeights),
            bottom: this._getItemsHeightsSum(this._range.stop, this._itemsHeightData.itemsHeights.length, this._itemsHeightData.itemsHeights)
        };
    }

    /**
     * Расчет видимых индексов от заранее высчитанных высот
     * @remark
     * Используется для оптимизаций частных случаев, когда построить один лишний элемент будет очень дорого,
     * например если один элемент это огромный пункт с кучей контролов внутри)
     * @param startIndex Начальный индекс
     * @param itemsCount Количество элементов
     */
    private _createRangeByItemHeightProperty(startIndex: number, itemsCount: number): IRange {
        const itemsHeights = this._itemsHeightData.itemsHeights;
        const viewportHeight = this._containerHeightsData.viewport;

        let sumHeight = 0;
        let stop: number;
        let start: number = startIndex;

        for (let i = start; i < itemsCount; i++) {
            const itemHeight = itemsHeights[i];
            if (sumHeight + itemHeight <= viewportHeight) {
                sumHeight += itemHeight;
            } else {
                stop = i;
                break;
            }
        }

        if (stop === itemsCount - 1) {
            sumHeight = 0;

            for (let i = itemsCount - 1; i > 0; i--) {
                const itemHeight = itemsHeights[i];

                if (sumHeight + itemHeight <= viewportHeight) {
                    sumHeight += itemHeight;
                } else {
                    start = i;
                    break;
                }
            }
        }

        /**
         * @remark Так как списки итерируются пока i < stopIndex, то нужно добавить 1
         * @example items: [{height: 20, ...}, {height: 40, ...}, {height: 50, ...}], itemHeightProperty: 'height'
         * viewportHeight: 70
         * Если бы мы не добавили единицу, то получили бы startIndex = 0 и stopIndex = 2, но так как итерируюется
         * пока i < stopIndex, то мы получим не три отрисованных элемента, а 2
         */
        return this._setRange({start, stop: stop + 1});
    }

    /**
     * Расчет видимых индексов от переданного индекса
     * @remark
     * Вызывается при инциализации виртуального скролла от переданного индекса
     * @param startIndex
     * @param itemsCount
     */
    private _createRangeByIndex(startIndex: number, itemsCount: number): IRange {
        const pageSize = this._options.pageSize;
        let start, stop;

        if (pageSize < itemsCount || !pageSize) {
            start = startIndex;
            stop = start + pageSize;

            if (stop >= itemsCount) {
                stop = itemsCount;
                start = stop - pageSize;
            }
        } else {
            start = 0;
            stop = itemsCount;
        }

        return this._setRange({start, stop});
    }

    private _updateStartIndex(index: number, itemsCount: number): void {
        const start = Math.max(0, index);
        const stop = Math.min(itemsCount, this._range.start + this._options.pageSize);
        this._range.start = Math.max(0, index);
        this._range.stop = Math.min(itemsCount, this._range.start + this._options.pageSize);
    }

    private _insertItemHeights(insertIndex: number, length: number) {
        const topItemsHeight = this._itemsHeightData.itemsHeights.slice(0, insertIndex + 1);
        const insertedItemsHeights = [];
        const bottomItemsHeight = this._itemsHeightData.itemsHeights.slice(insertIndex + 1);

        for (let i = 0; i < length; i++) {
            insertedItemsHeights[i] = 0;
        }

        this.updateItems({itemsHeights: topItemsHeight.concat(insertedItemsHeights, bottomItemsHeight)});
    }

    private _removeItemHeights(removeIndex: number, length: number) {
        this.updateItems({
            itemsHeights: this._itemsHeightData.itemsHeights.splice(removeIndex + 1, length)
        });
    }

    private _shiftRangeBySegment(direction: IDirection, segmentSize: number): IRange {
        const itemsCount = this._itemsHeightData.itemsHeights.length;
        let {start, stop} = this._range;

        if (direction === 'up') {
            start = Math.max(0, start - segmentSize);
        } else {
            stop = Math.min(stop + segmentSize, itemsCount);
        }

        return {
            start, stop
        };
    }

    /**
     * Рассчитывает сколько элементов нужно скрыть
     * @remark Оставляем элементов с запасом на 2 вьюпорта для плавного скроллинга
     */
    private static getItemsToHideQuantity(direction: string, currentRange: IRange, containerHeights: IContainerHeights, itemsHeights: IItemsHeights): number {
        if (direction === 'up') {
            return VirtualScroll._getItemsToHideQuantityToUp(currentRange, containerHeights, itemsHeights);
        } else {
            return VirtualScroll._getItemsToHideQuantityToDown(currentRange, containerHeights, itemsHeights);
        }
    }

    // Методы публичные для юнитов
    /**
     * Рассчитывает сколько элементов нужно скрыть сверху
     */
    static _getItemsToHideQuantityToUp(currentRange: IRange, heights: IContainerHeights, itemsHeights: IItemsHeights): number {
        let quantity = 0;
        let stop = currentRange.stop - 1;

        const offsetDistance = heights.viewport * 2 + heights.trigger;

        while (itemsHeights.itemsOffsets[stop] > offsetDistance) {
            stop--;
            quantity++;
        }

        return quantity;
    }

    /**
     * Рассчитывает сколько элементов нужно скрыть сверху
     */
    static _getItemsToHideQuantityToDown(currentRange: IRange, heights: IContainerHeights, itemsHeights: IItemsHeights): number {
        let quantity = 0;
        let start = currentRange.start;
        let sumHeight = 0;
        const offsetDistance = (heights.scroll - heights.viewport) - heights.trigger - heights.viewport;


        while (sumHeight + itemsHeights.itemsHeights[start] < offsetDistance) {
            sumHeight += itemsHeights.itemsHeights[start];
            quantity++;
            start++;
        }

        return quantity;
    }

    private _setRange(range: IRange): IRange {
        if (range.start !== this._range.start || range.stop !== this._range.stop) {
            this._range = range;
            this.rangeChanged = true;
        }

        return this._range;
    }

    private _getItemsHeightsSum(startIndex: number, stopIndex: number, itemsHeights: number[]): number {
        let sum = 0;

        for (let i = startIndex; i < stopIndex; i++) {
            sum += itemsHeights[i];
        }

        return sum;
    }
}