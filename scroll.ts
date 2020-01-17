import * as VS from './virtualscroll/controller';
import * as scrollUtils from './virtualscroll/util';
import {ICollection} from "./interfaces";

interface IOptions {
    collection: ICollection;
}

interface IRange {
    start: number;
    stop: number;
}

class Scroll {
    // Флаг необходимости восстановления скролла
    private restoreScroll: boolean;
    // Данные о высотах
    private itemsHeights: number[];
    private viewportHeight: number;
    private itemsContainerHeight: number;
    private triggerOffset: number;
    private scrollTop: number;

    private get heights(): IHeights {
        return {
            viewport: this.viewportHeight,
            trigger: this.triggerOffset,
            itemsContainer: this.itemsContainerHeight,
            scrollTop: this.scrollTop,
            items: this.itemsHeights
        }
    }

    protected _beforeMount(options): void {
        if (options.itemHeightProperty) {
            this.saveHeights(options.collection, options.itemHeightProperty);
            this.applyIndexes(VS.getRangeByItemHeightProperty(options.activeElement, this.heights));
        } else {
            this.applyIndexes(VS.getRangeByIndex(options.activeElement));
        }

        this.subscribeToModelChange(options.collection);
    }

    protected _afterMount(): void {
        this.observeScrollEvents();
    }

    protected _beforeUpdate(options): void {
        if (options.collection !== this._options.collection) {
            this.subscribeToModelChange(options.collection);
        }
    }

    protected _afterRender(): void {
        if (this.restoreScroll) {
            this.restoreScrollPosition();
            this.restoreScroll = false;
        }
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
        this.restoreScroll = true;
    }

    private observeScrollEvents(): void {
        this._children.observer.start();
    }

    /**
     * Обработчик на события Scroll.Watcher(видимость триггеров, изменение скролла, изменение скроллбара и пр.)
     * @param action
     * @param params
     */
    private scrollEventHandler(action: string, params: {scrollTop: number, scrollHeight: number, viewportHeight: number}): void {
        this.saveHeights(params);
        this[action](params);
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
        const result = VS.getRangeByDirection(triggerName, this.range, this._options.segmentSize, this.heights);
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
        return new Promise(resolve => {
            if (scrollUtils.canScrollToItem(getIndexById(id), this.range, this.heights)) {
                this.scrollSync();
                resolve();
            } else {
                await this.applyIndexes(VS.getRangeByIndex(getIndexById(id)));
                this.scrollSync();
                resolve();
            }
        });
    }
}