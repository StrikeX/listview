import {ICollectionCommand, ICommandEvent} from "../interfaces";
import {TKey, ICollection} from "../interfaces";


export interface IMarkedItem {
    marked: Boolean;

}


export class Mark implements ICollectionCommand<IMarkedItem> {
    constructor(private key: TKey) {}

    execute(collection: ICollection<IMarkedItem>): void {
    }
}

export class MarkNext implements ICollectionCommand<IMarkedItem> {
    execute(collection: ICollection<IMarkedItem>): void {
        //найти элемент с текущем маркером
        //перетащит маркер на следующий элемент
    }
    getNewValue(){

    }
}
export class MarkPrev implements ICollectionCommand<IMarkedItem> {
    execute(collection: ICollection<IMarkedItem>): void {
    }
}