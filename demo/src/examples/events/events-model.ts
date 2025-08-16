import { Model, Collection } from 'nextbone';

export interface PersonData {
  id?: number;
  name: string;
}

export class PersonModel extends Model<PersonData> {
  defaults() {
    return { name: 'Unnamed' };
  }
}

export class PeopleCollection extends Collection<PersonModel> {
  model = PersonModel;
}
