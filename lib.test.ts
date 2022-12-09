import { filterItems } from './lib'

describe('filterItems', () => {
  it('returns the items containing the word', async () => {
    const items = [{ str: 'f' }, { str: 'oo bar' }, { str: 'baz' }, { str: 'qux' }]

    expect(filterItems('  ', items)).toEqual([])
    expect(filterItems('rba', items)).toEqual([])
    expect(filterItems('f', items)).toEqual([items[0]])
    expect(filterItems('foo', items)).toEqual([items[0], items[1]])
    expect(filterItems('oo', items)).toEqual([items[1]])
    expect(filterItems('o', items)).toEqual([items[1]])
    expect(filterItems('bar', items)).toEqual([items[1]])
    expect(filterItems('baz', items)).toEqual([items[2]])
  })
})
