import { expect, test } from 'bun:test'
import RouteTable from './route-table'

test('RouteTable', () => {
    const table = new RouteTable<number>()

    // Add data
    table.add('/foo/bar', 'GET', 1)
    table.add('/foo/bar', 'POST', 2)
    table.add('/foo/baz', 'GET', 3)
    table.add('/foo/baz', 'POST', 4)
    table.add('/foo/:id', 'GET', 5)
    table.add('/foo/:id', 'POST', 6)
    table.add('/foo/:id', 'PUT', 7)
    table.add('/foo/:id', 'DELETE', 8)
    table.add('/foo/:id/:id2', 'GET', 9)
    table.add('/foo/:id/:id2', 'POST', 10)
    table.add('/foo/:id/:id2', 'PUT', 11)
    table.add('/foo/:id/:id2', 'DELETE', 12)
    table.add('/foo/:id/bar/:id3', 'GET', 13)
    table.add('/foo/:id/bar/:id3', 'POST', 14)
    table.add('/foo/:id/bar/:id3', 'PUT', 15)
    table.add('/foo/:id/bar/:id3', 'DELETE', 16)
    table.add('/slash/:slash/slash', 'GET', 17)

    expect(table.matchAll('/foo/bar', 'GET')).toEqual(
        [
            { handler: 1, params: {} },
            { handler: 5, params: { id: 'bar' } },
        ]
    )

    expect(table.matchAll('/foo/bar', 'POST')).toEqual(
        [
            { handler: 2, params: {} },
            { handler: 6, params: { id: 'bar' } },
        ]
    )

    expect(table.matchAll('/slash/%2F/slash', 'GET')).toEqual(
        [
            { handler: 17, params: { slash: '/' } },
        ]
    )

    for (const [path, verb, handler] of table) {
        console.log(path, verb, handler)
        table.delete(path, verb, handler)
    }

    expect(table.size).toEqual(0)

})

test('Performance', function () {
    const letters = 'abcdefghijklmnopqrstuvwxyz'
    const table = new RouteTable<number>()
    const start = performance.now()
    function loop(prefix: string, i: number) {
        for (const letter of letters) {
            if (performance.now() - start > 1000) {
                return
            }
            const path = prefix + letter
            table.add(path, 'GET', i)
            if (i < 5) {
                loop(path + '/', i + 1)
            }
        }
    }
    loop('', 0)
    console.log(`Injest speed: ${table.size} / sec`)
    const enumStart = performance.now()
    const routes = [...table]
    const enumEnd = performance.now()
    console.log(`Enum speed: ${routes.length * (1000 / (enumEnd - enumStart))} / sec`)

    const matchStart = performance.now()
    for (const [path, verb, handler] of routes) {
        table.matchAll(path, verb)
    }
    const matchEnd = performance.now()
    console.log(`Match speed: ${routes.length * (1000 / (matchEnd - matchStart))} / sec`)

    const deleteStart = performance.now()
    for (const [ path, verb, handler ] of routes) {
        table.delete(path, verb, handler)
    }
    const deleteEnd = performance.now()
    console.log(`Delete speed: ${routes.length * (1000 / (deleteEnd - deleteStart))} / sec`)
})