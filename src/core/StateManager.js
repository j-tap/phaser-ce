/* jshint newcap: false */

/**
* @author       Richard Davey <rich@photonstorm.com>
* @copyright    2016 Photon Storm Ltd.
* @license      {@link https://github.com/photonstorm/phaser/blob/master/license.txt|MIT License}
*/

/**
* The State Manager is responsible for loading, setting up and switching game states.
*
* @class Phaser.StateManager
* @constructor
* @param {Phaser.Game} game - A reference to the currently running game.
* @param {Phaser.State|Object} [pendingState=null] - A State object to seed the manager with.
*/
Phaser.StateManager = function (game, pendingState)
{

    /**
    * @property {Phaser.Game} game - A reference to the currently running game.
    */
    this.game = game;

    /**
    * @property {object} states - The object containing Phaser.States.
    */
    this.states = {};

    /**
    * @property {Phaser.State} _pendingState - The state to be switched to in the next frame.
    * @private
    */
    this._pendingState = null;

    if (typeof pendingState !== 'undefined' && pendingState !== null)
    {
        this._pendingState = pendingState;
    }

    /**
    * @property {boolean} _clearWorld - Clear the world when we switch state?
    * @private
    */
    this._clearWorld = false;

    /**
    * @property {boolean} _clearCache - Clear the cache when we switch state?
    * @private
    */
    this._clearCache = false;

    /**
    * @property {boolean} _created - Flag that sets if the State has been created or not.
    * @private
    */
    this._created = false;

    /**
    * @property {any[]} _args - Temporary container when you pass vars from one State to another.
    * @private
    */
    this._args = [];

    /**
    * @property {string} current - The current active State object.
    * @default
    */
    this.current = '';

    /**
    * onStateChange is a Phaser.Signal that is dispatched whenever the game changes state.
    *
    * It is dispatched only when the new state is started, which isn't usually at the same time as StateManager.start
    * is called because state swapping is done in sync with the game loop. It is dispatched *before* any of the new states
    * methods (such as preload and create) are called, and *after* the previous states shutdown method has been run.
    *
    * The callback you specify is sent two parameters: the string based key of the new state,
    * and the second parameter is the string based key of the old / previous state.
    *
    * @property {Phaser.Signal} onStateChange
    */
    this.onStateChange = new Phaser.Signal();

    /**
    * @property {function} onInitCallback - This is called when the state is set as the active state.
    * @default
    */
    this.onInitCallback = null;

    /**
    * @property {function} onPreloadCallback - This is called when the state starts to load assets.
    * @default
    */
    this.onPreloadCallback = null;

    /**
    * @property {function} onCreateCallback - This is called when the state preload has finished and creation begins.
    * @default
    */
    this.onCreateCallback = null;

    /**
    * @property {function} onUpdateCallback - This is called when the state is updated, every game loop. It doesn't happen during preload (@see onLoadUpdateCallback).
    * @default
    */
    this.onUpdateCallback = null;

    /**
    * @property {function} onRenderCallback - This is called post-render. It doesn't happen during preload (see onLoadRenderCallback).
    * @default
    */
    this.onRenderCallback = null;

    /**
    * @property {function} onResizeCallback - This is called if ScaleManager.scalemode is RESIZE and a resize event occurs. It's passed the new width and height.
    * @default
    */
    this.onResizeCallback = null;

    /**
    * @property {function} onPreRenderCallback - This is called before the state is rendered and before the stage is cleared but after all game objects have had their final properties adjusted.
    * @default
    */
    this.onPreRenderCallback = null;

    /**
    * @property {function} onLoadUpdateCallback - This is called when the State is updated during the preload phase.
    * @default
    */
    this.onLoadUpdateCallback = null;

    /**
    * @property {function} onLoadRenderCallback - This is called when the State is rendered during the preload phase.
    * @default
    */
    this.onLoadRenderCallback = null;

    /**
    * @property {function} onPausedCallback - This is called when the game is paused.
    * @default
    */
    this.onPausedCallback = null;

    /**
    * @property {function} onResumedCallback - This is called when the game is resumed from a paused state.
    * @default
    */
    this.onResumedCallback = null;

    /**
    * @property {function} onPauseUpdateCallback - This is called every frame while the game is paused.
    * @default
    */
    this.onPauseUpdateCallback = null;

    /**
    * @property {function} onShutDownCallback - This is called when the state is shut down (i.e. swapped to another state).
    * @default
    */
    this.onShutDownCallback = null;

};

Phaser.StateManager.prototype = {

    /**
    * The Boot handler is called by Phaser.Game when it first starts up.
    * @method Phaser.StateManager#boot
    * @private
    */
    boot: function ()
    {

        this.game.onPause.add(this.pause, this);
        this.game.onResume.add(this.resume, this);

        if (this._pendingState !== null && typeof this._pendingState !== 'string')
        {
            this.add('default', this._pendingState, true);
        }

    },

    /**
    * Adds a new State into the StateManager. You must give each State a unique key by which you'll identify it.
    *
    * The State can be any of
    *
    *  - a plain JavaScript object containing at least one required callback (see {@link #checkState})
    *  - an instance of {@link Phaser.State}
    *  - an instance of a class extending Phaser.State
    *  - a constructor function (class)
    *
    * If a function is given a new state object will be created by calling it, passing the current {@link Phaser.Game game} as the first argument.
    *
    * @method Phaser.StateManager#add
    * @param {string} key - A unique key you use to reference this state, i.e. "MainMenu", "Level1".
    * @param {Phaser.State|object|function} state  - The state you want to switch to.
    * @param {boolean} [autoStart=false]  - If true the State will be started immediately after adding it.
    */
    add: function (key, state, autoStart)
    {

        if (autoStart === undefined) { autoStart = false; }

        var newState;

        if (state instanceof Phaser.State)
        {
            newState = state;
        }
        else if (typeof state === 'object')
        {
            newState = state;
            newState.game = this.game;
        }
        else if (typeof state === 'function')
        {
            newState = new state(this.game);
        }

        this.states[key] = newState;

        if (autoStart)
        {
            if (this.game.isBooted)
            {
                this.start(key);
            }
            else
            {
                this._pendingState = key;
            }
        }

        return newState;

    },

    /**
    * Delete the given state.
    * @method Phaser.StateManager#remove
    * @param {string} key - A unique key you use to reference this state, i.e. "MainMenu", "Level1".
    */
    remove: function (key)
    {

        if (this.current === key)
        {
            this.callbackContext = null;

            this.onInitCallback = null;
            this.onShutDownCallback = null;

            this.onPreloadCallback = null;
            this.onLoadRenderCallback = null;
            this.onLoadUpdateCallback = null;
            this.onCreateCallback = null;
            this.onUpdateCallback = null;
            this.onPreRenderCallback = null;
            this.onRenderCallback = null;
            this.onResizeCallback = null;
            this.onPausedCallback = null;
            this.onResumedCallback = null;
            this.onPauseUpdateCallback = null;
        }

        delete this.states[key];

    },

    /**
    * Start the given State. If a State is already running then State.shutDown will be called (if it exists) before switching to the new State.
    *
    * @method Phaser.StateManager#start
    * @param {string} key - The key of the state you want to start.
    * @param {boolean} [clearWorld=true] - Clear everything in the world? This clears the World display list fully (but not the Stage, so if you've added your own objects to the Stage they will need managing directly)
    * @param {boolean} [clearCache=false] - Clear the Game.Cache? This purges out all loaded assets. The default is false and you must have clearWorld=true if you want to clearCache as well.
    * @param {...*} parameter - Additional parameters that will be passed to the State.init function (if it has one).
    */
    start: function (key, clearWorld, clearCache)
    {

        if (clearWorld === undefined) { clearWorld = true; }
        if (clearCache === undefined) { clearCache = false; }

        if (this.checkState(key))
        {
            //  Place the state in the queue. It will be started the next time the game loop begins.
            this._pendingState = key;
            this._clearWorld = clearWorld;
            this._clearCache = clearCache;

            if (arguments.length > 3)
            {
                this._args = Array.prototype.splice.call(arguments, 3);
            }
        }

    },

    /**
    * Restarts the current State. State.shutDown will be called (if it exists) before the State is restarted.
    *
    * @method Phaser.StateManager#restart
    * @param {boolean} [clearWorld=true] - Clear everything in the world? This clears the World display list fully (but not the Stage, so if you've added your own objects to the Stage they will need managing directly)
    * @param {boolean} [clearCache=false] - Clear the Game.Cache? This purges out all loaded assets. The default is false and you must have clearWorld=true if you want to clearCache as well.
    * @param {...*} parameter - Additional parameters that will be passed to the State.init function if it has one.
    */
    restart: function (clearWorld, clearCache)
    {

        if (clearWorld === undefined) { clearWorld = true; }
        if (clearCache === undefined) { clearCache = false; }

        //  Place the state in the queue. It will be started the next time the game loop starts.
        this._pendingState = this.current;
        this._clearWorld = clearWorld;
        this._clearCache = clearCache;

        if (arguments.length > 2)
        {
            this._args = Array.prototype.slice.call(arguments, 2);
        }

    },

    /**
    * Used by onInit and onShutdown when those functions don't exist on the state
    * @method Phaser.StateManager#dummy
    * @private
    */
    dummy: function ()
    {
    },

    /**
    * preUpdate is called right at the start of the game loop. It is responsible for changing to a new state that was requested previously.
    *
    * @method Phaser.StateManager#preUpdate
    */
    preUpdate: function ()
    {

        if (this._pendingState && this.game.isBooted)
        {
            var previousStateKey = this.current;

            //  Already got a state running?
            this.clearCurrentState();

            this.setCurrentState(this._pendingState);

            this.onStateChange.dispatch(this.current, previousStateKey);

            if (this.current !== this._pendingState)
            {
                return;
            }
            else
            {
                this._pendingState = null;
            }

            //  If StateManager.start has been called from the init of a State that ALSO has a preload, then
            //  onPreloadCallback will be set, but must be ignored
            if (this.onPreloadCallback)
            {
                this.game.load.reset(true);
                this.onPreloadCallback.call(this.callbackContext, this.game);

                //  Is the loader empty?
                if (this.game.load.totalQueuedFiles() === 0 && this.game.load.totalQueuedPacks() === 0)
                {
                    this.loadComplete();
                }
                else
                {
                    //  Start the loader going as we have something in the queue
                    this.game.load.start();
                }
            }
            else
            {
                //  No init? Then there was nothing to load either
                this.loadComplete();
            }
        }

    },

    /**
    * This method clears the current State, calling its shutdown callback. The process also removes any active tweens,
    * resets the camera, resets input, clears physics, removes timers and if set clears the world and cache too.
    *
    * @method Phaser.StateManager#clearCurrentState
    */
    clearCurrentState: function ()
    {

        if (this.current)
        {
            if (this.onShutDownCallback)
            {
                this.onShutDownCallback.call(this.callbackContext, this.game);
            }

            this.game.tweens.removeAll();

            this.game.camera.reset();

            this.game.input.reset(true);

            this.game.physics.clear();

            this.game.time.removeAll();

            this.game.scale.reset(this._clearWorld);

            if (this.game.debug)
            {
                this.game.debug.reset();
            }

            if (this._clearWorld)
            {
                this.game.world.shutdown();

                if (this._clearCache)
                {
                    this.game.cache.destroy();
                }
            }
        }

    },

    /**
    * Checks if a given phaser state is valid. A State is considered valid if it has at least one of the core functions: preload, create, update or render.
    *
    * @method Phaser.StateManager#checkState
    * @param {string} key - The key of the state you want to check.
    * @return {boolean} true if the State has the required functions, otherwise false.
    */
    checkState: function (key)
    {

        var state = this.states[key];

        if (state)
        {
            if (state.preload || state.create || state.update || state.render)
            {
                return true;
            }
            else
            {
                console.warn('Invalid Phaser State object given. Must contain at least one of the required functions: preload, create, update or render');
                return false;
            }
        }
        else
        {
            console.warn('Phaser.StateManager - No state found with the key: ' + key);
            return false;
        }

    },

    /**
    * Links game properties to the State given by the key.
    *
    * @method Phaser.StateManager#link
    * @param {string} key - State key.
    * @protected
    */
    link: function (key)
    {

        var state = this.states[key];

        state.game = this.game;
        state.add = this.game.add;
        state.make = this.game.make;
        state.camera = this.game.camera;
        state.cache = this.game.cache;
        state.input = this.game.input;
        state.load = this.game.load;
        state.math = this.game.math;
        state.sound = this.game.sound;
        state.scale = this.game.scale;
        state.state = this;
        state.stage = this.game.stage;
        state.time = this.game.time;
        state.tweens = this.game.tweens;
        state.world = this.game.world;
        state.particles = this.game.particles;
        state.rnd = this.game.rnd;
        state.physics = this.game.physics;
        state.key = key;

    },

    /**
    * Nulls all State level Phaser properties, including a reference to Game.
    *
    * @method Phaser.StateManager#unlink
    * @param {string} key - State key.
    * @protected
    */
    unlink: function (key)
    {

        var state = this.states[key];

        if (state)
        {
            state.game = null;
            state.add = null;
            state.make = null;
            state.camera = null;
            state.cache = null;
            state.input = null;
            state.load = null;
            state.math = null;
            state.sound = null;
            state.scale = null;
            state.state = null;
            state.stage = null;
            state.time = null;
            state.tweens = null;
            state.world = null;
            state.particles = null;
            state.rnd = null;
            state.physics = null;
        }

    },

    /**
    * Sets the current State. Should not be called directly (use StateManager.start)
    *
    * @method Phaser.StateManager#setCurrentState
    * @param {string} key - State key.
    * @private
    */
    setCurrentState: function (key)
    {

        var state = this.states[key];

        this.callbackContext = state;

        this.link(key);

        //  Used when the state is set as being the current active state
        this.onInitCallback = state['init'] || this.dummy;

        this.onPreloadCallback = state['preload'] || null;
        this.onLoadRenderCallback = state['loadRender'] || null;
        this.onLoadUpdateCallback = state['loadUpdate'] || null;
        this.onCreateCallback = state['create'] || null;
        this.onUpdateCallback = state['update'] || null;
        this.onPreRenderCallback = state['preRender'] || null;
        this.onRenderCallback = state['render'] || null;
        this.onResizeCallback = state['resize'] || null;
        this.onPausedCallback = state['paused'] || null;
        this.onResumedCallback = state['resumed'] || null;
        this.onPauseUpdateCallback = state['pauseUpdate'] || null;

        //  Used when the state is no longer the current active state
        this.onShutDownCallback = state['shutdown'] || this.dummy;

        //  Reset the physics system, but not on the first state start
        if (this.current !== '')
        {
            this.game.physics.reset();
        }

        this.current = key;
        this._created = false;

        //  At this point key and pendingState should equal each other
        this.onInitCallback.apply(this.callbackContext, this._args);

        //  If they no longer do then the init callback hit StateManager.start
        if (key === this._pendingState)
        {
            this._args = [];
        }

        this.game._kickstart = true;

    },

    /**
     * Gets the current State.
     *
     * @method Phaser.StateManager#getCurrentState
     * @return {Phaser.State}
     * @public
     */
    getCurrentState: function ()
    {
        return this.states[this.current];
    },

    /**
    * @method Phaser.StateManager#loadComplete
    * @protected
    * @see Phaser.StateManager#preUpdate
    */
    loadComplete: function ()
    {

        if (this._created === false && this.onCreateCallback)
        {
            this._created = true;
            this.onCreateCallback.call(this.callbackContext, this.game);
        }
        else
        {
            this._created = true;
        }

    },

    /**
    * @method Phaser.StateManager#loadUpdate
    * @protected
    * @see Phaser.Loader#finishedLoading
    */
    loadUpdate: function ()
    {

        if (this._created === false && this.onLoadUpdateCallback)
        {
            this.onLoadUpdateCallback.call(this.callbackContext, this.game);
        }

    },

    /**
    * @method Phaser.StateManager#pause
    * @protected
    */
    pause: function ()
    {

        if (this._created && this.onPausedCallback)
        {
            this.onPausedCallback.call(this.callbackContext, this.game);
        }

    },

    /**
    * @method Phaser.StateManager#resume
    * @protected
    */
    resume: function ()
    {

        if (this._created && this.onResumedCallback)
        {
            this.onResumedCallback.call(this.callbackContext, this.game);
        }

    },

    /**
    * @method Phaser.StateManager#update
    * @protected
    */
    update: function ()
    {

        if (this._created)
        {
            if (this.onUpdateCallback)
            {
                this.onUpdateCallback.call(this.callbackContext, this.game);
            }
        }
        else
        if (this.onLoadUpdateCallback)
        {
            this.onLoadUpdateCallback.call(this.callbackContext, this.game);
        }

    },

    /**
    * @method Phaser.StateManager#pauseUpdate
    * @protected
    */
    pauseUpdate: function ()
    {

        if (this._created)
        {
            if (this.onPauseUpdateCallback)
            {
                this.onPauseUpdateCallback.call(this.callbackContext, this.game);
            }
        }
        else
        if (this.onLoadUpdateCallback)
        {
            this.onLoadUpdateCallback.call(this.callbackContext, this.game);
        }

    },

    /**
    * @method Phaser.StateManager#preRender
    * @protected
    * @param {number} elapsedTime - The time elapsed since the last update.
    */
    preRender: function (elapsedTime)
    {

        if (this._created && this.onPreRenderCallback)
        {
            this.onPreRenderCallback.call(this.callbackContext, this.game, elapsedTime);
        }

    },

    /**
    * @method Phaser.StateManager#resize
    * @protected
    */
    resize: function (width, height)
    {

        if (this.onResizeCallback)
        {
            this.onResizeCallback.call(this.callbackContext, width, height);
        }

    },

    /**
    * @method Phaser.StateManager#render
    * @protected
    */
    render: function ()
    {

        if (this._created)
        {
            if (this.onRenderCallback)
            {
                if (this.game.renderType === Phaser.CANVAS)
                {
                    this.game.context.save();
                    this.game.context.setTransform(1, 0, 0, 1, 0, 0);
                    this.onRenderCallback.call(this.callbackContext, this.game);
                    this.game.context.restore();
                }
                else
                {
                    this.onRenderCallback.call(this.callbackContext, this.game);
                }
            }
        }
        else
        if (this.onLoadRenderCallback)
        {
            this.onLoadRenderCallback.call(this.callbackContext, this.game);
        }

    },

    /**
    * Removes all StateManager callback references to the State object, nulls the game reference and clears the States object.
    * You don't recover from this without rebuilding the Phaser instance again.
    * @method Phaser.StateManager#destroy
    */
    destroy: function ()
    {

        this._clearWorld = true;
        this._clearCache = true;

        this.clearCurrentState();

        this.callbackContext = null;

        this.onInitCallback = null;
        this.onShutDownCallback = null;

        this.onPreloadCallback = null;
        this.onLoadRenderCallback = null;
        this.onLoadUpdateCallback = null;
        this.onCreateCallback = null;
        this.onUpdateCallback = null;
        this.onRenderCallback = null;
        this.onPausedCallback = null;
        this.onResumedCallback = null;
        this.onPauseUpdateCallback = null;

        this.game = null;
        this.states = {};
        this._pendingState = null;
        this.current = '';

    }

};

Phaser.StateManager.prototype.constructor = Phaser.StateManager;

/**
* @name Phaser.StateManager#created
* @property {boolean} created - True if the current state has had its `create` method run (if it has one, if not this is true by default).
* @readOnly
*/
Object.defineProperty(Phaser.StateManager.prototype, 'created', {

    get: function ()
    {

        return this._created;

    }

});

/**
* "It's like nailing jelly to a kitten" - Gary Penn
*/
