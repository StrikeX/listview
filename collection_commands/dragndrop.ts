import {ICollectionCommand, ICommandEvent} from "../interfaces";
import {TKey, ICollection} from "../interfaces";
import {Display} from "../display";

export interface IDragItem {
    dragStart: boolean;
    dragMove: boolean;
}

/*первые прикидки. см коментарий внизу файла*/
export class Start implements ICollectionCommand<IDragItem> {
    constructor(private key: TKey) {
    }

    execute(collection: ICollection<IDragItem>): void {
        //поменить элементы, как перемещаемые
        collection[this.key].dragStart = true;
    }
}

export class Move implements ICollectionCommand<IDragItem> {
    constructor(private key: TKey) {}

    execute(collection: ICollection<IDragItem>): void {
        //поменить элементы, как перемещаемые
        if(collection[this.key].dragStart){
            collection[this.key].dragMove = true;
            collection[this.key].dragStart = false;
        }
    }
}

export class Finish implements ICollectionCommand<IDragItem> {
    constructor(private key: TKey) {}

    execute(collection: ICollection<IDragItem>): void {
        //удалить элементы, т.к. перемещение успешно завершено
        collection[this.key].dragMove = false;
    }
}

export class Cancel implements ICollectionCommand<IDragItem> {
    constructor(private key: TKey) {}

    execute(collection: ICollection<IDragItem>): void {
        //сбросить пометку о перемещаемых записях
    }
}

/*Крайнов стал объяснять как будет работать переемещение через проекцию
* но не успел. Скорей всего будут проблемы.
* Сейчас перемещение внутри проекции. Скорей всего его не захотят выносить*/
export class StartDragNDrop {
    constructor(){

    }
    execute(display:Display, key:TKey){

    }
}