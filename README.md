# state-mutate

## A sane state handling library (for React)

A mix of 'not invented here'-syndrome and the illusion that [redux](https://github.com/rackt/redux) can reduced (heh!) to something more understandable.

## Goals

- Minimalism (60 LOC!)
- Naming that tries to be helpful
- Declarative and terse API
- Asynchronous actions chains built-in

## Architecture & Conventions

### API

1. **There is a single global state tree.**
2. **Actions** describe changes to the state, based on the old state and a parameter. </br> There are two kinds of actions:
    * Immediate action:
    
        ```javascript
        function toggleDetailInfo (oldState) {
             return {
                changes: {
                    showDetailInfo: !oldState.showDetailInfo,
                }
             };
        }
        ```
    
    * Asynchronous action with side effect
    
        ```javascript
        function loadArticles (oldState, pageToLoad) {
            return {
                // immediate changes to the state
                changes: {
                    loading: true 
                },
                
                // the sideEffect does something remotely and returns a Promise
                // (oldState and param can be passed with a closure)
                sideEffect: () => requestArticlesFromBackend(pageToLoad),
                
                // what to do when the Promise returned by sideEffect resolves
                success: (oldState, result) => ({
                    changes: {
                        articles: oldState.articles.concat(result.articles),
                        loading: false
                    }
                }),
                
                // what to do when the Promise is rejected
                failure: (oldState, error) => ({
                    changes: {
                        error: error,
                        loading: false
                    }
                })
            };
        }
        ```
3. **Mutators** define an initial state for **a subtree of the global state**</br>and a **collection of actions** acting on this subtree.

    ```javascript
    const articleMutator = {
        initialState: {
            articles: [],
            loading: false,
            loadedPages: 0;
            error: null,
            showDetailInfo: false
        },
        
        actions: {
            load: loadArticles,
            toggleDetailInfo: toggleDetailInfo
        }
    }
    ```

4. A single **Mutator Map** maps mutators to state subtrees.

    ```javascript
    const mutatorMap = {
        articles: articleMutator,
        topics: topicsMutator
    };
    ```

5. A **Store** is created using a Mutator Map, it will set up the initial state given by the mutators.
    
    ```javascript
    import Store from 'state-mutate';
    
    const store = new Store(mutatorMap);
    ```

    * access the state via `store.state`
    
        ```javascript
        console.log(store.state.articles.loading);
        // => false
        ```
    
    * dispatch actions via `store.mutate.mutator.action(param, doneCallback)`
    
        ```javascript
        store.mutate.articles.load(null, callback);
        
        console.log(store.state.articles.loading);
        // => true
        
        function callback () {
            console.log(store.state.articles.loading);
            // => false
            
            console.log(store.state.articles.articles);
            // => [{id: 4783, title: "An Article", ...}, ...]
        }
        ```


### Recommended React Patterns

1. **Connectors** map global state and mutators to components and their properties</br>and make server-side pre-loading & -rendering possible.

    ```javascript
    const articleConnector = {
        
        connect (state, mutate) {
            const loadMore = () => mutate.articles.load();
            
            return <div>
                <ArticleList articles={state.articles.articles}/>
                {state.loading
                    ? "Loading..."
                    : <button onClick={loadMore}>Load More</button>}
            </div>
        }
        
        fetchInitialData (state, mutate, done) {
            if (state.articles.articles.length === 0)
                mutate.articles.load(null, done);
            else
                done();
        }
        
    }
    ```

2. **A Top-Level `App` Component** that owns the store</br>and renders Connectors with it (based on routes, for example)</br>TODO...