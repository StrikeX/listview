import {ICollectionCommand, ICommandEvent} from "../interfaces";
import {TKey, ICollection} from "../interfaces";

export interface IEditingItem {
    editing: Boolean;
}


export class Begin implements ICollectionCommand<IEditingItem> {
    constructor(private key: TKey) {}
    execute(collection: ICollection<IEditingItem>): void{
    }
}
export class Cancel implements ICollectionCommand<IEditingItem> {
    execute(collection: ICollection<IEditingItem>): void{
    }
}
export class Apply implements ICollectionCommand<IEditingItem> {
    constructor(private proceed: Boolean) {}

    execute(collection: ICollection<IEditingItem>): void {
        let commands: ICollectionCommand<IEditingItem>[] = [];
        //всегда завершаем предыдущее редактирование
        commands.push(new Cancel());

        //если нужно, запускаем новое
        //здесь под вопросом кто должен запускать новое редактирование, потому что для запуска нового редактирования
        //нужно вызвать метод Create и нужны еще вызовы событий
        //поэтому возможно, что в коммандах останется только включение и выключение редактирования
        if (this.proceed) {
            let new_key: TKey = null; //следующий ключ
            commands.push(new Begin(new_key));
        }
        collection.applyCommand(commands);

    }
}