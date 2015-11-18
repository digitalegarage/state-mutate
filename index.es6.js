export default class Store {
    constructor (subtreeToMutatorMap) {
        this.state = {};
        this.listeners = [];
        this.mutate = {};

        for (let [subtree, mutator] of pairs(subtreeToMutatorMap)) {
            this.state[subtree] = mutator.initialState();

            this.mutate[subtree] = {};

            for (let [actionName, action] of pairs(mutator.actions)) {
                this.mutate[subtree][actionName] = (param, doneCallback) => {
                    let actionResult = action(this.state[subtree], param);
                    return this.handleActionResult(subtree, actionResult, doneCallback);
                }
            }
        }
    }

    handleActionResult (subtree, actionResult, doneCallback) {

        if (actionResult.changes) {
            for (let [property, value] of pairs(actionResult.changes)) {
                this.state[subtree][property] = value;
            }

            for (let listener of this.listeners) {
                listener(this.state, actionResult);
            }
        }

        if (actionResult.async) {
            const {sideEffect, success: successAction, failure: failureAction} = actionResult.async;

            const sideEffectPromise = sideEffect();

            sideEffectPromise
            .then(
                result => this.handleActionResult(subtree, successAction(this.state[subtree], result), doneCallback),
                error => this.handleActionResult(subtree, failureAction(this.state[subtree], error), doneCallback))
            .catch(exceptionInSuccessOrFailureAction => {
                // prevent the promise from swallowing the exception, we should definitely crash
                setTimeout(() => {throw exceptionInSuccessOrFailureAction;}, 0)
            });
        } else {
            if (doneCallback) doneCallback();
        }
    }

    subscribe (listener) {
        this.listeners.push(listener);
    }
}

function * pairs (object) {
    for (let key of Object.keys(object)) {
        yield [key, object[key]];
    }
}