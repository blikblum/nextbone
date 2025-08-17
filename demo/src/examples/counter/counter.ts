import { Model } from 'nextbone';

export interface CounterData {
  count: number;
}

export class CounterModel extends Model<CounterData> {
  defaults() {
    return { count: 0 };
  }
}
