import {
    mergeRecursive,
    hasTouch,
    selectElement,
    isSimpleObject,
    getDataModelFromRange,
    ReservedFields,
    FieldType,
    defaultValue
} from 'muze-utils';
import { ALL_ACTIONS } from './enums/actions';
import SelectionSet from './selection-set';
import {
    initializeBehaviouralActions,
    initializeSideEffects,
    changeSideEffectAvailability,
    initializePhysicalActions,
    unionSets,
    getSideEffects,
    setSideEffectConfig
} from './helper';

const cloneObj = (behaviourEffectMap) => {
    const keys = Object.keys(behaviourEffectMap);

    return keys.reduce((acc, key) => {
        const value = behaviourEffectMap[key];
        const cloned = value.map((d) => {
            let clonedVal = d;
            if (isSimpleObject(d)) {
                clonedVal = mergeRecursive({}, d);
            }
            return clonedVal;
        });
        acc[key] = cloned;
        return acc;
    }, {});
};

const getKeysFromCriteria = (criteria, firebolt) => {
    if (criteria) {
        const data = firebolt.data();
        const { dimensionsMap, dimensions: dimArr } = firebolt._metaData;

        let values = [];
        if (isSimpleObject(criteria)) {
            const dm = getDataModelFromRange(data, criteria);
            const fieldsConfig = Object.assign({}, dm.getFieldsConfig(), {
                [ReservedFields.ROW_ID]: {
                    index: Object.keys(dm.getFieldsConfig()).length,
                    def: {
                        name: ReservedFields.ROW_ID,
                        type: FieldType.DIMENSION
                    }
                }
            });
            dm.getData({ withUid: true }).data.forEach((row) => {
                const dimKey = `${dimArr.map(d => row[fieldsConfig[d].index])}`;
                const measures = criteria[ReservedFields.MEASURE_NAMES] || dimensionsMap[dimKey] || [[]];
                measures.forEach((measureArr) => {
                    values.push(`${[dimKey, ...measureArr]}`);
                });
            });
        } else {
            values = criteria.slice(1, criteria.length).map(d => `${d}`);
        }
        return values;
    }
    return null;
};

/**
 * This class is responsible for dispatching behavioural actions and side effects. It also keeps the information of
 * registered physical actions, behavioural actions and side effects. Also, it keeps the map of physical and behavioural
 * actions and behavioural actions and side effects. Whenever any behavioural action is dispatched, it also propagates
 * the rows which got affected to the other datamodels. This class is initialized by {@link VisualUnit} and legend to
 * manage it's interaction.
 *
 * @public
 * @class Firebolt
 * @module Firebolt
 */
export default class Firebolt {
    constructor (context, actions, sideEffects, behaviourEffectMap) {
        this.context = context;
        this._sideEffectDefinitions = {};
        this._sideEffects = {};
        this._propagationInf = {};
        this._sourceSelectionSet = {};
        this._actions = {
            behavioural: {},
            physical: {}
        };
        this._selectionSet = {};
        this._volatileSelectionSet = {};
        this._propagationFields = {};
        this._sideEffectPolicies = {};
        this._propagationBehaviourMap = {};
        this._behaviourPolicies = {};
        this._actionBehaviourMap = {};
        this._config = {};
        this._behaviourEffectMap = {};
        this._entryExitSet = {};
        this._actionHistory = {};
        this._queuedSideEffects = {};
        this._handlers = {};
        this._payloadGenerators = {};
        this._payloads = {};

        this.mapSideEffects(cloneObj(behaviourEffectMap));
        this.registerBehaviouralActions(actions.behavioural);
        this.registerSideEffects(sideEffects);
        this.registerPhysicalBehaviouralMap(actions.physicalBehaviouralMap);
        this.registerPhysicalActions(actions.physical);
    }

    config (...config) {
        if (config.length) {
            this._config = mergeRecursive(this._config, config[0]);
            setSideEffectConfig(this.sideEffects(), this._config);
            return this;
        }
        return this._config;
    }

    mapSideEffects (behEffectMap) {
        const behaviourEffectMap = this._behaviourEffectMap;
        for (const key in behEffectMap) {
            if ({}.hasOwnProperty.call(behEffectMap, key)) {
                const sideEffects = behEffectMap[key] || [];
                let preventDefaultActions = false;
                let effectNames;
                if (isSimpleObject(sideEffects)) {
                    effectNames = sideEffects.effects;
                    preventDefaultActions = sideEffects.preventDefaultActions;
                } else {
                    effectNames = sideEffects;
                }
                effectNames = effectNames.map((effect) => {
                    if (!isSimpleObject(effect)) {
                        return {
                            name: effect
                        };
                    }
                    return effect;
                });
                !behaviourEffectMap[key] && (behaviourEffectMap[key] = []);
                this._behaviourEffectMap[key] = [...new Set(preventDefaultActions ? effectNames :
                    [...behaviourEffectMap[key], ...effectNames])];
            }
        }
        return this;
    }

    registerBehaviouralActions (actions) {
        const behaviours = initializeBehaviouralActions(this, actions);
        this.prepareSelectionSets(behaviours);
        Object.assign(this._actions.behavioural, behaviours);
        return this;
    }

    prepareSelectionSets () {
        return this;
    }

    registerSideEffects (sideEffects) {
        for (const key in sideEffects) {
            this._sideEffectDefinitions[sideEffects[key].formalName()] = sideEffects[key];
        }
        this.initializeSideEffects();
        return this;
    }

    applySideEffects (sideEffects, selectionSet, payload) {
        const sideEffectStore = this.sideEffects();
        const actionHistory = this._actionHistory;
        const queuedSideEffects = this._queuedSideEffects;
        sideEffects.forEach((sideEffect) => {
            const effects = sideEffect.effects;
            const behaviours = sideEffect.behaviours;
            let combinedSet = this.mergeSelectionSets(behaviours);
            effects.forEach((effect) => {
                let options = {};
                let name;
                if (typeof effect === 'object') {
                    name = effect.name;
                    options = effect.options || {};
                } else {
                    name = effect;
                }
                const set = options.set;
                if (set) {
                    combinedSet = this.mergeSelectionSets(set);
                }
                const sideEffectInstance = sideEffectStore[name];
                if (sideEffectInstance && sideEffectInstance.isEnabled()) {
                    if (!sideEffectInstance.constructor.mutates() &&
                        Object.values(actionHistory).some(d => d.isMutableAction)) {
                        queuedSideEffects[`${name}-${behaviours.join()}`] = {
                            name,
                            params: [combinedSet, payload, options]
                        };
                    } else {
                        this.dispatchSideEffect(name, combinedSet, payload, options);
                    }
                }
            });
        });
        return this;
    }

    dispatchSideEffect (name, selectionSet, payload, options = {}) {
        const sideEffectStore = this.sideEffects();
        const sideEffect = sideEffectStore[name];
        const { setTransform } = options;
        selectionSet = setTransform ? setTransform(selectionSet, payload, this) : selectionSet;
        sideEffect.apply(selectionSet, payload, options);
    }

    registerPropagationBehaviourMap (map) {
        this._propagationBehaviourMap = Object.assign(this._propagationBehaviourMap, map || {});
        return this;
    }

    dispatchBehaviour (behaviour, payload, propagationInfo = {}) {
        payload = this.sanitizePayload(payload);
        const propagate = propagationInfo.propagate !== undefined ? propagationInfo.propagate : true;
        const behaviouralActions = this._actions.behavioural;
        const action = behaviouralActions[behaviour];
        const behaviourEffectMap = this._behaviourEffectMap;
        const sideEffects = getSideEffects(behaviour, behaviourEffectMap);
        this._propagationInf = propagationInfo;
        this._payloads[behaviour] = payload;

        if (action) {
            action.dispatch(payload);
            this._entryExitSet[behaviour] = action.entryExitSet();
            const shouldApplySideEffects = this.shouldApplySideEffects(propagationInfo);

            if (propagate) {
                this.propagate(behaviour, payload, action.propagationIdentifiers(), { sideEffects });
            }

            if (shouldApplySideEffects) {
                const applicableSideEffects = this.getApplicableSideEffects(sideEffects, payload, propagationInfo);
                this.applySideEffects(applicableSideEffects, this.getEntryExitSet(behaviour), payload);
            }
        }

        return this;
    }

    getPropagationSelectionSet (selectionSet) {
        return selectionSet.find(d => !d.sourceSelectionSet);
    }

    shouldApplySideEffects () {
        return true;
    }

    changeBehaviourStateOnPropagation (behaviour, value, key = 'default') {
        const behaviourConditions = this._behaviourPolicies[behaviour] || (this._behaviourPolicies[behaviour] = {});
        if (value instanceof Function) {
            behaviourConditions[key] = value;
        } else {
            behaviourConditions[key] = () => value;
        }
        return this;
    }

    changeSideEffectStateOnPropagation (sideEffect, value, key = 'default') {
        const sideEffectConditions = this._sideEffectPolicies[sideEffect] ||
            (this._sideEffectPolicies[sideEffect] = {});
        if (value instanceof Function) {
            sideEffectConditions[key] = value;
        } else {
            sideEffectConditions[key] = () => value;
        }
    }

    removeSideEffectPolicy (sideEffect, key) {
        delete this._sideEffectPolicies[sideEffect][key];
        return this;
    }

    removeBehaviourPolicy (behaviour, key) {
        delete this._behaviourPolicies[behaviour][key];
        return this;
    }

    propagate () {
        return this;
    }

    sideEffects (...sideEffects) {
        if (sideEffects.length) {
            this._sideEffects = sideEffects[0];
            return this;
        }
        return this._sideEffects;
    }

    enableSideEffects (fn) {
        changeSideEffectAvailability(this, fn, true);
        return this;
    }

    disableSideEffects (fn) {
        changeSideEffectAvailability(this, fn, false);
        return this;
    }

    dissociateBehaviour (behaviour, physicalAction) {
        const actionBehaviourMap = this._actionBehaviourMap;
        for (const key in actionBehaviourMap) {
            if (key === physicalAction) {
                const behaviourMap = actionBehaviourMap[key];
                behaviourMap.behaviours = behaviourMap.behaviours.filter(d => d !== behaviour);
                this.mapActionsAndBehaviour(key);
            }
        }

        return this;
    }

    dissociateSideEffect (sideEffect, behaviour) {
        const behaviourEffectMap = this._behaviourEffectMap;
        behaviourEffectMap[behaviour] = behaviourEffectMap[behaviour].filter(d => (d.name || d) !== sideEffect);
        return this;
    }

    getApplicableSideEffects (sideEffects) {
        return sideEffects;
    }

    attachPropagationListener (dataModel, handler = this.onDataModelPropagation()) {
        dataModel.unsubscribe('propagation');
        dataModel.on('propagation', handler);
        return this;
    }

    onDataModelPropagation () {
        return (propValue) => {
            const payload = propValue.payload;
            const action = payload.action;

            this.dispatchBehaviour(action, payload, {
                propagate: false
            });
        };
    }

    createSelectionSet (uniqueIds, behaviouralActions) {
        const behaviours = behaviouralActions || this._actions.behavioural;
        const selectionSet = this._selectionSet;
        const volatileSelectionSet = this._volatileSelectionSet;

        for (const key in behaviours) {
            if ({}.hasOwnProperty.call(behaviours, key)) {
                selectionSet[key] = new SelectionSet(uniqueIds);
                volatileSelectionSet[key] = new SelectionSet(uniqueIds, true);
                this._entryExitSet[key] = null;
            }
        }

        this._volatileSelectionSet = volatileSelectionSet;
        this.selectionSet(selectionSet);
        return this;
    }

    selectionSet (...selectionSet) {
        if (selectionSet.length) {
            this._selectionSet = selectionSet[0];
            return this;
        }
        return this._selectionSet;
    }

    initializeSideEffects () {
        const sideEffectDefinitions = this._sideEffectDefinitions;
        this.sideEffects(initializeSideEffects(this, sideEffectDefinitions));
        return this;
    }

    target () {
        return 'all';
    }

    registerPhysicalActions (actions, context = this) {
        const initedActions = initializePhysicalActions(context, actions);
        Object.assign(this._actions.physical, initedActions);
        return this;
    }

    /**
     * Allows to propagate the datamodel with only the supplied fields. When propagation is done, then the fields
     * which are supplied for the specified behavioural action is propagated.
     *
     * @public
     *
     * @param {string} action Name of behavioural action. If '*' is specified, then for all behavioural actions it is
     * applied.
     * @param {Array} fields Array of field names which will be propagated.
     * @param {boolean} append If true, then it is appended to the existing propagation data model fields else only
     * those fields are projected from propagation data model and propagated.
     *
     * @return {Firebolt} Instance of firebolt
     */
    propagateWith (action, fields, append = false) {
        const behaviouralActions = this._actions.behavioural;
        if (action === ALL_ACTIONS) {
            for (const key in behaviouralActions) {
                this._propagationFields[key] = {
                    fields,
                    append
                };
            }
        } else {
            this._propagationFields[action] = {
                fields,
                append
            };
        }
        return this;
    }

    /**
     * Map actions and behaviours
     * @return {Firebolt} Firebolt instance
     */
    mapActionsAndBehaviour (phyAction) {
        const initedPhysicalActions = this._actions.physical;
        const map = this._actionBehaviourMap;

        for (const action in map) {
            if (!({}).hasOwnProperty.call(action, map) && action === (phyAction || action)) {
                let target;
                const mapObj = map[action];
                target = mapObj.target;
                const touch = mapObj.touch;
                if (!target) {
                    target = this.context.getDefaultTargetContainer();
                }
                const bind = hasTouch() ? touch === true || touch === undefined : !touch;
                bind && this.bindActionWithBehaviour(initedPhysicalActions[action],
                    target, mapObj.behaviours);
            }
        }
        this.registerPhysicalActionHandlers();
        return this;
    }

    registerPhysicalBehaviouralMap (map) {
        this._actionBehaviourMap = mergeRecursive(this._actionBehaviourMap, map);
        return this;
    }

    /**
     * Binds a target element with an action.
     *
     * @param {Function} action Action method
     * @param {string} target Class name of element
     * @param {Array} behaviourList Array of behaviours
     * @return {FireBolt} Instance of firebolt
     */
    bindActionWithBehaviour (action, targets, behaviourList) {
        if (typeof (targets) === 'string') {
            targets = [targets];
        }
        targets.forEach((target) => {
            const mount = this.context.mount();
            const nodes = target.node instanceof Function ? target : selectElement(mount).selectAll(target);
            if (!nodes.empty()) {
                if (nodes instanceof Array) {
                    nodes.forEach((node) => {
                        action(selectElement(node), behaviourList);
                    });
                } else {
                    action(nodes, behaviourList);
                }
            }
        });
        return this;
    }

    getPropagationInf () {
        return this._propagationInf;
    }

    getAddSetFromCriteria (criteria, propagationInf = {}) {
        return {
            model: propagationInf.data ? propagationInf.data : null,
            uids: criteria ? getKeysFromCriteria(criteria, this) : null
        };
    }

    getSelectionSets (action) {
        const sourceId = this.id();
        const propagationInf = this._propagationInf || {};
        const propagationSource = propagationInf.sourceId;
        let applicableSelectionSets = [];
        if (propagationSource !== sourceId) {
            applicableSelectionSets = [this._volatileSelectionSet[action]];
        }

        if (propagationSource) {
            applicableSelectionSets.push(this.selectionSet()[action]);
        }
        return applicableSelectionSets;
    }

    getFullData () {
        return this.context.data();
    }

    resetted () {
        return this._resetted;
    }

    /**
     * Returns the entry and exit set information of the specified behavioural action.
     *
     * @public
     *
     * @param {string} behaviour Name of behavioural action.
     *
     * @return {Object} Entry exit set information.
     */
    getEntryExitSet (behaviour) {
        return this._entryExitSet[behaviour];
    }

    mergeSelectionSets (behaviours) {
        return unionSets(this, behaviours);
    }

    data () {
        return this.context.data();
    }

    triggerPhysicalAction (event, payload) {
        const handlers = this._handlers[event] || [];
        const genericHandlers = this._handlers['*'];

        const allHandlers = [...Object.values(handlers), ...Object.values(genericHandlers)];
        allHandlers.forEach((fn) => {
            fn(event, payload);
        });

        return this;
    }

    onPhysicalAction (event, fn, namespace) {
        !this._handlers[event] && (this._handlers[event] = {});
        this._handlers[event][namespace] = fn;

        return this;
    }

    registerPhysicalActionHandlers () {
        this.onPhysicalAction('*', (event, payload) => {
            const { behaviours } = this._actionBehaviourMap[event];
            behaviours.forEach(beh => this.dispatchBehaviour(beh, payload));
        });
    }

    id () {
        return this.context.id();
    }

    getRangeFromIdentifiers (...params) {
        return this.context.getRangeFromIdentifiers(...params);
    }

    sanitizePayload (payload) {
        return payload;
    }

    payloadGenerators (...params) {
        if (params.length) {
            Object.assign(this._payloadGenerators, params[0]);
        }
        return this._payloadGenerators;
    }

    getPayloadGeneratorFor (action) {
        const defaultFn = this._payloadGenerators.__default;
        const fn = this._payloadGenerators[action];

        return defaultValue(fn, defaultFn);
    }

    getPayload (action) {
        return this._payloads[action];
    }
}
