import VirtualScroll from './virtualscroll/controller';
import * as scrollUtils from './virtualscroll/util';
import {ICollection} from "./interfaces";
import {IContainerHeights, IDirection, IItemsHeights, IRange, IVirtualScrollOptions} from "./virtualscroll/interfaces";

interface IOptions {
    collection: ICollection;
    pageSize: number;
    segmentSize: number;
    activeElement?: string;
    itemHeightProperty?: string;
    virtualScroll: boolean;
    virtualScrollConfig: IVirtualScrollOptions;
}

interface IScrollEventParams {
    viewportHeight: number;
    scrollTop: number;
    scrollHeight: number;
}

class Scroll {
    private _virtualScroll: VirtualScroll = new VirtualScroll({}, {}, {});
    private _options: IOptions;
    private _children: {
        observer: {
            start: () => void
        },
        itemsContainer: HTMLElement;
    };
    private _triggerVisibility: {
        up: boolean;
        down: boolean;
    }

    // Флаг необходимости восстановления скролла
    private _restoreScroll: boolean;
    private _restoreScrollDirection: IDirection;

    // Функция которую нужно выполнить в следующую перерисовку
    private _afterRenderCallback: Function = null;

    private _itemsChanged: boolean;

    protected _beforeMount(options: IOptions): void {
        if (options.virtualScroll) {
            this._initVirtualScroll(options);
        }
    }

    protected _afterMount(): void {
        this._observeScrollEvents();
    }

    protected _beforeUpdate(options: IOptions): void {
        if (options.collection !== this._options.collection && this._options.virtualScroll) {
            this._initVirtualScroll(options);
        }
    }

    protected _afterRender(): void {
        if (this._options.virtualScroll && this._itemsChanged) {
            this._itemsChanged = false;
            this._virtualScroll.applyItemsData(Scroll.getItemsHeightsDataByContainer(this._children.itemsContainer));
        }

        if (this._afterRenderCallback) {
            this._afterRenderCallback();
            this._afterRenderCallback = null;
        }

        if (this._restoreScroll) {
            scrollToPosition(this._virtualScroll.getRestoredPosition(this._restoreScrollDirection));
        }
    }

    /**
     * Функция подскролла к элементу
     * @param {string | number} key
     * @remark Функция подскролливает к записи, если это возможно, в противном случае вызовется перестроение
     * от элемента
     */
    scrollToItem(key: string): Promise<void> {
        const index = this._options.collection.getIndexById(key);

        if (this._options.virtualScroll) {
            return this._virtualScrollToItem(index);
        } else {
            return this._nativeScrollToItem(index);
        }
    }

    private _virtualScrollToItem(index: number): Promise<void> {
        return new Promise((resolve, reject) => {
            const callback = () => {
                scrollToPosition(this._virtualScroll.itemsHeightsData.itemsOffsets[index]);
                resolve();
            };

            if (scrollUtils.canScrollToItem(
                index,
                this._virtualScroll.range,
                this._virtualScroll.itemsHeightsData,
                this._virtualScroll.containerHeightsData
            )) {
                callback();
            } else {
                this._applyIndexes(this._options.collection, this._virtualScroll.updateRangeByIndex(index));
                this._afterRenderCallback = callback;
            }
        });
    }


    private _nativeScrollToItem(index: number): Promise<void> {
        return new Promise((resolve, reject) => {
            const container = this._children.itemsContainer[index];

            if (container) {
                scrollToElement(container as HTMLElement);
                resolve();
            } else {
                reject();
            }
        });
    }

    private _observeScrollEvents(): void {
        this._children.observer.start();
    }

    private _initVirtualScroll(options: IOptions): void {
        this._virtualScroll.setOptions({
            segmentSize: options.segmentSize, pageSize: options.pageSize
        });

        const initialIndex = options.activeElement ? options.collection.getItemIndexById(options.activeElement) : 0;

        if (options.itemHeightProperty) {
            this._virtualScroll.applyItemsData(Scroll.getItemsHeightsDataByItemHeightProperty(options.collection, options.itemHeightProperty));
        } else {
            this._virtualScroll.applyItemsData(Scroll.mockItemsHeightsData(options.collection.getCount()));
        }

        this._applyIndexes(
            options.collection,
            this._virtualScroll.updateRangeByIndex(initialIndex)
        );

        this._subscribeToCollectionChange(options.collection);
    }

    private _subscribeToCollectionChange(collection: ICollection): void {
        collection.subscribe('onChange', this._collectionChangeHandler);
    }

    private _collectionChangeHandler(
        event: string,
        changesType: string,
        action: string,
        newItems: CollectionItem[],
        newItemsIndex: number,
        removedItems: CollectionItem[],
        removedItemsIndex: number): void {
        if (changesType === 'collectionChanged' && action) {

            if (action === IObservable.ACTION_ADD || action === IObservable.ACTION_MOVE) {
                this._itemsAddedHandler(newItemsIndex, newItems);
            }

            if (action === IObservable.ACTION_REMOVE || action === IObservable.ACTION_MOVE) {
                this._itemsRemovedHandler(removedItemsIndex, removedItems);
            }

            if (action === IObservable.ACTION_RESET) {
                this._initVirtualScroll(this._options);
            }
        }
    }

    private _itemsAddedHandler(addIndex: number, items: CollectionItem[]): void {
        this._insertItemsHeights(addIndex, items.length);
        const direction = addIndex <= this._options.collection.getStartIndex() ? 'up' : 'down';

        if (this._triggerVisibility[direction]) {
            if (direction === 'up') {
                this._virtualScroll.updateStartIndex(this._virtualScroll.range.start + items.length);
            }

            this._recalcToDirection(direction, false);
        }
    }

    private _itemsRemovedHandler(removeIndex: number, items: CollectionItem[]): void {
        this._removeItemsHeights(removeIndex, items.length);

        this._recalcToDirection(
            removeIndex < this._options.collection.getStartIndex() ? 'up' : 'down', false
        );
    }

    /**
     * Обработчик на события Scroll.Watcher(видимость триггеров, изменение скролла, изменение скроллбара и пр.)
     * @param action
     * @param params
     */
    private _scrollEventHandler(action: string, params: IScrollEventParams): void {
        this._updateHeights(params);
        this[action](params);
    }

    /**
     * Обработчик изменения размера вьюпорта
     * @param params
     */
    private _viewportResize(params: IScrollEventParams): void {
        if (this._options.virtualScroll) {
            this._updateItemsHeights();
        }
    }

    /**
     * Обработчик смены размера контейнера с элементами
     */
    private _viewResize(): void {
        if (this._options.virtualScroll) {
            this._updateHeights({scrollHeight: this._children.itemsContainer.offsetHeight});
            this._updateItemsHeights();
        }
    }

    /**
     * Обработчик на событие скролла
     */
    private _scrollMove(): void {
        const activeElementIndex = scrollUtils.getActiveElementIndex(
            this._virtualScroll.range,
            this._virtualScroll.itemsHeightsData,
            this._virtualScroll.containerHeightsData
        );
        const activeElementId = this._options.collection.getItemIdByIndex(activeElementIndex);
        this._notify('activeElementChanged', [activeElementId]);
    }

    /**
     * Обработчик на событие смещения скроллбара
     */
    private scrollBarMove(): void {
        this._applyIndexes(this._options.collection, this._virtualScroll.updateRangeByScrollTop());
    }

    private triggerVisibilityChanged(triggerName: string, triggerState: boolean): void {
        if (triggerState) {
            this._recalcToDirection(triggerName);
        }

        this._triggerVisibility[triggerName] = triggerState;
    }

    private _recalcToDirection(direction: IDirection, shouldLoad?: boolean): void {
        const recalcResult = this._virtualScroll.updateRangeByDirection(direction, shouldLoad);

        if (recalcResult.needToLoad) {
            this._notify('loadMore', [direction]);
        }

        this._applyIndexes(this._options.collection, recalcResult.range);
        this._restoreScroll = true;
        this._restoreScrollDirection = direction;
    }

    /**
     * Обновление высот
     * @param params
     */
    private _updateHeights(params: Partial<IScrollEventParams>): void {
        this._virtualScroll.applyContainerHeightsData(params);
    }

    private _updateItemsHeights(): void {
        this._virtualScroll.applyItemsData(Scroll.getItemsHeightsDataByContainer(this._children.itemsContainer));
    }

    private _addItemsHeights(index: number, length: number): void {
        /**
         * добавляет высоты в середину данных о высотах элементов
         */
    }

    private _removeItemsHeights(index: number, length: number): void {
        /**
         * Удаляются высоты из середины данных о высотах элементов
         */
    }

    private _applyIndexes(collection: ICollection, range: IRange): void {
        collection.setViewIndices(range);
        this._itemsChanged = true;
    }

    private static getItemsHeightsDataByItemHeightProperty(collection: ICollection, property: string): IItemsHeights {
        const itemsHeights = [];
        const itemsOffsets = [];

        let sum = 0;

        collection.each((item, i) => {
            const itemHeight = item.get(property);

            itemsHeights[i] = itemHeight;
            itemsOffsets[i] = sum;

            sum += itemHeight;
        });

        return {
            itemsHeights,
            itemsOffsets
        }
    }

    private static getItemsHeightsDataByContainer(container: HTMLElement): IItemsHeights {
        const itemsHeights = [];
        const itemsOffsets = [];

        let sum = 0;

        Array.prototype.forEach.apply(container.children, (item: HTMLElement, i) => {
            const itemHeight = item.getBoundingClientRect().height;

            itemsHeights[i] = itemHeight;
            itemsOffsets[i] = sum;

            sum += itemHeight;
        });

        return {
            itemsHeights,
            itemsOffsets
        }
    }

    private static mockItemsHeightsData(length: number): IItemsHeights {
        const mockData = [];

        for (let i = 0; i < length; i++) {
            mockData.push(0);
        }

        return {
            itemsHeights: mockData.slice(),
            itemsOffsets: mockData.slice()
        };
    }
}