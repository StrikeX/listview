import {TKey, Promise, ICollection, CollectionEachCallback, ICollectionCommand, ISelectionObject, IListItem} from "./interfaces";
import Select from "./collection_commands/select";
import Marker from "./collection_commands/marker";
import Editing from "./collection_commands/editing";
import Render from "./render";
import {Display} from "./display"
import {StartDragNDrop} from "./collection_commands/dragndrop";


/*
* в списке много задач, когда нжуно работать с данными из рекордсета
* setSelectedKey могут позвать на записи, которые не в виртуальном скролле.
* */
class ListItem implements IListItem, Select.ISelectionItem, Marker.IMarkedItem {
    key: TKey = null;
    selected: Boolean = false;
    marked: Boolean = false;
    editing: Boolean = false;
    active: Boolean = false;
}


class Collection implements ICollection<ListItem>{
    each(callback: CollectionEachCallback) {

    }
    applyCommand<T>(commands: ICollectionCommand<T>[]) {
        for (let i in commands) {
            commands[i].execute(this);
        }

    }
}

interface  IListViewOptions {
    isProceedEditing: Boolean,
    markedKey : TKey,
    selectedKeys: TKey[],
    excludedKeys: TKey[],
    editingKey: null,
    collection: ICollection<IListItem>
}

class ListView {
    render: Render = new Render();
    private display;
    constructor(
        private selectionObject: ISelectionObject,
        private isEditing: Boolean = false,
        private options: IListViewOptions = {
            isProceedEditing: false,
            markedKey : null,
            selectedKeys: [],
            excludedKeys: [],
            editingKey: null,
            collection: null
        }
    ) {
    }

    _beforeMount(options: IListViewOptions){

        this.display = new Display(0, 100, options.collection);

        let commands: ICollectionCommand<>[] = [];
        commands.push(new Marker.Mark(options.markedKey));
        commands.push(new Select.Sync(options.selectedKeys, options.excludedKeys));
        if(options.editingKey) {
            commands.push(new Editing.Begin(options.editingKey));
        }
        //операции над записью будем рассчитывать лениво, при наведении мышкой
        //commands.push(new Actions.Sync(options.itemActions));
        this.display.executeCommands(commands);
    }

    /*
        работа с выделением
     */
    onCheckBoxClickHandler(key: TKey) {
        //TODO как изменить options.selectedKeys и options.excludedKeys?
        let selectToggle = new Select.Toggle(this.options.selectedKeys, this.options.excludedKeys, key);
        this.display.executeCommands(([selectToggle]);
    }

    /*
        работа с марекром
     */

    onItemClick(key: TKey) {
        let commands: ICollectionCommand<>[] = [];
        //TODO как изменить markedKey?
        let mark = commands.push(new Marker.Mark(key));
        if (this.isEditing) {
            commands.push(new Editing.Begin(key))
        }
        this.display.executeCommands(commands);
        //this.notify(mark.getNewValue());
    }


    onDownClick() {
        //TODO как изменить markedKey?
        let markNext = new Marker.MarkNext();
        this.display.executeCommands([markNext]);
        //this.notify(markNext.getNewValue());
    }
    onUpClick() {
        //TODO как изменить markedKey?
        let markPrev = new Marker.MarkPrev();
        this.display.executeCommands([markPrev]);
        //this.notify(markPrev.getNewValue());
    }
    onItemActionClick(){
        //TODO как нотиваить события?
        //TODO как подписаться на события Render?
        //this.notify()
    }
    /*
        работа с редактированием по месту
     */
    onApplyEditing() {
        let editingApply = new Editing.Apply(this.options.isProceedEditing);
        this.display.executeCommands([editingApply]);
    }
    onCancelEditing() {
        let editingCancel = new Editing.Cancel();
        this.display.executeCommands([editingCancel]);
    }
/*drag-n-drop*/
    private onMouseDownHandler(){


    }
    private onMouseUpHandler(){

    }
    private onMouseMoveHandler(key:TKey){
        this.
        let startDragnDrop = new StartDragNDrop();
        startDragnDrop.execute(this.display, key);
        //this.execCommands([])
    }


    execCommands(commands: ICollectionCommand<any>[]) {
        commands.forEach(command => {
            command.execute(this.collection);

        });
    }

}

