import VirtualScroll from './virtualscroll/controller';
import * as scrollUtils from './virtualscroll/util';
import {ICollection} from "./interfaces";
import {IHeights} from "./virtualscroll/interfaces";

interface IOptions {
    collection: ICollection;
    pageSize: number;
    segmentSize: number;
    activeElement?: string;
    itemHeightProperty?: string;
}

interface IScrollEventParams {
    viewportHeight: number;
    scrollTop: number;
    scrollHeight: number;
}

class Scroll {
    // Флаг необходимости восстановления скролла
    private _restoreScroll: boolean;
    // Данные о высотах
    private _itemsHeights: number[];
    private _itemsOffsets: number[];
    private _viewportHeight: number;
    private _itemsContainerHeight: number;
    private _triggerOffset: number;
    private _scrollTop: number;
    private _virtualScroll: VirtualScroll = new VirtualScroll({});

    private get heights(): IHeights {
        return {
            viewport: this._viewportHeight,
            trigger: this._triggerOffset,
            itemsContainer: this._itemsContainerHeight,
            scrollTop: this._scrollTop,
            items: this._itemsHeights,
            itemsOffsets: this._itemsOffsets
        };
    }

    protected _beforeMount(options: IOptions): void {
        this.initVS(options);
    }

    protected _afterMount(): void {
        this.observeScrollEvents();
    }

    protected _beforeUpdate(options): void {
        if (options.collection !== this._options.collection) {
            this.initVS(options);
        }
    }

    protected _afterRender(): void {
        if (this._restoreScroll) {
            this.restoreScrollPosition();
            this._restoreScroll = false;
        }
    }

    private initVS(options: IOptions): void {
        this._virtualScroll.setOptions({
            segmentSize: options.segmentSize, pageSize: options.pageSize
        });

        const initialIndex = options.activeElement ? options.collection.getItemIndexById(options.activeElement) : 0;

        if (options.itemHeightProperty) {
            this.saveHeightsFromItemHeightProperty(options.collection, options.itemHeightProperty);
            this.applyIndexes(
                this._virtualScroll.setRangeByItemHeightProperty(
                    initialIndex, this.heights
                )
            );
        } else {
            this.applyIndexes(this._virtualScroll.updateRangeByIndex(initialIndex, options.collection.getCount()));
        }

        this.subscribeToModelChange(options.collection);
    }

    private saveHeightsFromItemHeightProperty(collection: ICollection, property: string): void {
        collection.each((item, index) => {
            this._itemsHeights[index] = item.get(property);
        });
    }

    private subscribeToModelChange(model: ICollection): void {
        model.subscribe('onChange', this.modelChangeHandler);
    }

    private modelChangedHandler = (event: string, changesType: string, action: string, newItems: CollectionItem<entityRecord>[],
                                   newItemsIndex: number, removedItems: CollectionItem<entityRecord>[], removedItemsIndex: number): void => {
        if (modelChanged && action) {
            this.itemsCount = this._options.collection.getCount();

            if (action === IObservable.ACTION_ADD || action === IObservable.ACTION_MOVE) {
                this.itemsAddedHandler(newItemsIndex, newItems);
            }

            if (action === IObservable.ACTION_REMOVE || action === IObservable.ACTION_MOVE) {
                this.itemsRemovedHandler(removedItemsIndex, removedItems);
            }

            if (action === IObservable.ACTION_RESET) {
                this.reset();
            }
        }
    }

    /**
     * Применяет индексы в коллекцию
     * @remark При применении индексов произойдет перерисовка и поменяется позиция скролла, следовательно здесь нужно
     * проставить флаг сохранения скролла
     * @param indexes
     */
    private applyIndexes(indexes): void {
        this._options.collection.applyIndexes(indexes);
        this._restoreScroll = true;
    }

    private observeScrollEvents(): void {
        this._children.observer.start();
    }

    /**
     * Обработчик на события Scroll.Watcher(видимость триггеров, изменение скролла, изменение скроллбара и пр.)
     * @param action
     * @param params
     */
    private scrollEventHandler(action: string, params: IScrollEventParams): void {
        this.updateHeights(params);
        this[action](params);
    }

    private viewresizeEvent(): void {
        this.updateHeights();
    }

    private updateHeights(params?: IScrollEventParams) {
        if (params) {
            this._viewportHeight = params.viewportHeight;
            this._itemsContainerHeight = params.scrollHeight;
            this._scrollTop = params.scrollTop;
        }

        this.updateTriggerOffset();
        this.updateItemsHeights();
    }

    /**
     * Обработчик на событие скролла
     */
    private scrollMove(): void {
        const activeElementIndex = scrollUtils.getActiveElementIndex(this.range, this.heights);
        const activeElementId = this._options.collection.getItemIdByIndex(activeElementIndex);
        this._notify('activeElementChanged', [activeElementId]);
    }

    /**
     * Обработчик на событие смещения скроллбара
     */
    private scrollBarMove(): void {
        this.applyIndexes(VS.getRangeByScrollTop(this.heights));
    }


    private triggerVisibilityChanged(triggerName: string, triggerState: boolean): void {
        if (triggerState) {
            this.recalcToDirection(triggerName);
        }

        this.triggerVisibility[triggerName] = triggerState;
    }

    private recalcToDirection(triggerName): void {
        const result = this._virtualScroll.updateRangeByDirection(triggerName, this.heights);
        this.applyIndexes(result.range);

        if (result.needToLoad) {
            this._notify('loadMore', [triggerName]);
        }
    }

    /**
     * Подскроллить к элементу с заданным id
     * @param id
     */
    scrollToItem(id: string): Promise<void> {
        const idx = this._options.collection.getIndexById(id);
        return new Promise(resolve => {
            if (scrollUtils.canScrollToItem(idx, this._virtualScroll.range, this.heights)) {
                this.scrollSync();
                resolve();
            } else {
                await this.applyIndexes(this._virtualScroll.updateRangeByIndex(idx, this._itemsHeights.length));
                this.scrollSync();
                resolve();
            }
        });
    }
}