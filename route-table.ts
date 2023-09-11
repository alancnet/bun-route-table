export type RouteMatch<T> = {
    handler: T
    params: { [param: string]: string }
}

export class RouteMap<T> {
    verbs = new Map<string, Set<T>>()
    parameters = new Map<string, RouteMap<T>>()
    children = new Map<string, RouteMap<T>>()
    get size() {
        return this.verbs.size + this.parameters.size + this.children.size
    }
    get fullSize() {
        let size = this.size
        for (const child of this.children.values()) {
            size += child.fullSize
        }
        for (const param of this.parameters.values()) {
            size += param.fullSize
        }
        return size
    }
}

export default class RouteTable<T> {

    private routes: RouteMap<T> = new RouteMap<T>()

    add(path: string, verb: string, handler: T) {
        const segments = path.split('/').map(decodeURIComponent)
        let routes = this.routes
        for (const segment of segments) {
            if (segment[0] === ':') {
                const param = segment.substring(1)
                routes = routes.parameters.get(param) || routes.parameters.set(param, new RouteMap()).get(param)!
            } else {
                routes = routes.children.get(segment) || routes.children.set(segment, new RouteMap()).get(segment)!
            }
        }
        const handlers = routes.verbs.get(verb) || routes.verbs.set(verb, new Set()).get(verb)!
        handlers.add(handler)
    }

    delete(path: string, verb: string, handler?: T): boolean {
        const segments = path.split('/').map(decodeURIComponent)
        function loop (routes: RouteMap<T>, i: number): boolean {
            if (i === segments.length) {
                if (handler !== undefined) {
                    const handlers = routes.verbs.get(verb)
                    if (handlers) {
                        if (handlers.delete(handler)) {
                            if (handlers.size === 0) {
                                routes.verbs.delete(verb)
                            }
                            return true
                        }
                    }
                    return false
                } else {
                    return routes.verbs.delete(verb)
                }
            }
            const segment = segments[i]
            if (segment[0] === ':') {
                const param = segment.substring(1)
                const paramData = routes.parameters.get(param)
                if (paramData) {
                    const result = loop(paramData, i + 1)
                    if (result) {
                        if (paramData.size === 0) {
                            routes.parameters.delete(param)
                        }
                        return true
                    }
                }
            } else {
                const childData = routes.children.get(segment)
                if (childData) {
                    const result = loop(childData, i + 1)
                    if (result) {
                        if (childData.size === 0) {
                            routes.children.delete(segment)
                        }
                        return true
                    }
                }
            }
            return false
        }
        return loop(this.routes, 0)
    }

    * match (path: string, verb: string): IterableIterator<RouteMatch<T>> {
        const segments = path.split('/').map(decodeURIComponent)
        function * loop (params: {[key:string]:string}, data: RouteMap<T>, i: number): IterableIterator<RouteMatch<T>> {
            if (i === segments.length) {
                if (data.verbs.has(verb)) {
                    for (const handler of data.verbs.get(verb)!) {
                        yield {
                            handler,
                            params
                        }
                    }
                }
                return
            }
            const segment = segments[i]
            if (data.children.has(segment)) {
                yield * loop(params, data.children.get(segment)!, i + 1)
            }
            if (data.parameters.size > 0) {
                for (const [param, paramData] of data.parameters) {
                    yield * loop({
                        ...params,
                        [param]: segment
                    }, paramData, i + 1)
                }
            }
        }
        yield * loop({}, this.routes, 0)
    }

    matchAll(path: string, verb: string): RouteMatch<T>[] {
        return [...this.match(path, verb)]
    }

    matchOne(path: string, verb: string): RouteMatch<T> | undefined {
        return this.match(path, verb).next().value
    }

    get size() {
        return this.routes.fullSize
    }

    [Symbol.iterator](): IterableIterator<[string, string, T]> {
        function * loop (path: string[], data: RouteMap<T>): IterableIterator<[string, string, T]> {
            for (const [verb, handlers] of data.verbs) {
                for (const handler of handlers) {
                    yield [path.join('/'), verb, handler]
                }
            }
            for (const [param, paramData] of data.parameters) {
                yield * loop([...path, `:${encodeURIComponent(param)}`], paramData)
            }
            for (const [segment, childData] of data.children) {
                yield * loop([...path, encodeURIComponent(segment)], childData)
            }
        }
        return loop([], this.routes)
    }

    get [Symbol.toStringTag]() {
        return 'RouteTable'
    }

}
