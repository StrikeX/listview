import {ICollection, IListItem} from "./interfaces";
import {TKey, Promise, ICollection, CollectionEachCallback, ICollectionCommand, ISelectionObject, IListItem} from "./interfaces";

export class Display {
    private renderList: ICollection<IListItem>;

    constructor(private startIndex:Number, private stopIndex: Number, private collection/*recordset*/){}

    each(){
        //перебирает collection от startIndex до stopIndex с учетом всех типов Item
        //return this.renderList;
    }

    executeCommands(commands: ICollectionCommand<any>[]){

    }
}