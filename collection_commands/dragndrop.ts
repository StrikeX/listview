import {ICollectionCommand, ICommandEvent} from "../interfaces";
import {TKey, ICollection} from "../interfaces";

export interface IDragItem {
}


export class Start implements ICollectionCommand<IDragItem> {
    constructor(private key: TKey) {}

    execute(collection: ICollection<IDragItem>): void {
        //поменить элементы, как перемещаемые
    }
}

export class Move implements ICollectionCommand<IDragItem> {
    constructor(private key: TKey) {}

    execute(collection: ICollection<IDragItem>): void {
        //поменить элементы, как перемещаемые
    }
}

export class Finish implements ICollectionCommand<IDragItem> {
    constructor(private key: TKey) {}

    execute(collection: ICollection<IDragItem>): void {
        //удалить элементы, т.к. перемещение успешно завершено
    }
}

export class Cancel implements ICollectionCommand<IDragItem> {
    constructor(private key: TKey) {}

    execute(collection: ICollection<IDragItem>): void {
        //сбросить пометку о перемещаемых записях
    }
}