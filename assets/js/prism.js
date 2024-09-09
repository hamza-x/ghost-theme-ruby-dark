/* PrismJS 1.29.0
https://prismjs.com/download.html#themes=prism-tomorrow&languages=markup+css+clike+javascript+bash+diff+json+markdown+jsx+tsx+regex+typescript+typoscript&plugins=line-highlight+line-numbers+command-line+toolbar+copy-to-clipboard+diff-highlight+treeview */
/// <reference lib="WebWorker"/>

// TODO(burdon): Add logo and recruiting link.
console.log('Hello DXOS');

var _self = (typeof window !== 'undefined')
  ? window   // if in browser
  : (
    (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope)
      ? self // if in worker
      : {}   // if in node js
  );

/**
 * Prism: Lightweight, robust, elegant syntax highlighting
 *
 * @license MIT <https://opensource.org/licenses/MIT>
 * @author Lea Verou <https://lea.verou.me>
 * @namespace
 * @public
 */
var Prism = (function (_self) {

  // Private helper vars
  var lang = /(?:^|\s)lang(?:uage)?-([\w-]+)(?=\s|$)/i;
  var uniqueId = 0;

  // The grammar object for plaintext
  var plainTextGrammar = {};

  var _ = {
    /**
     * By default, Prism will attempt to highlight all code elements (by calling {@link Prism.highlightAll}) on the
     * current page after the page finished loading. This might be a problem if e.g. you wanted to asynchronously load
     * additional languages or plugins yourself.
     *
     * By setting this value to `true`, Prism will not automatically highlight all code elements on the page.
     *
     * You obviously have to change this value before the automatic highlighting started. To do this, you can add an
     * empty Prism object into the global scope before loading the Prism script like this:
     *
     * ```js
     * window.Prism = window.Prism || {};
     * Prism.manual = true;
     * // add a new <script> to load Prism's script
     * ```
     *
     * @default false
     * @type {boolean}
     * @memberof Prism
     * @public
     */
    manual: _self.Prism && _self.Prism.manual,
    /**
     * By default, if Prism is in a web worker, it assumes that it is in a worker it created itself, so it uses
     * `addEventListener` to communicate with its parent instance. However, if you're using Prism manually in your
     * own worker, you don't want it to do this.
     *
     * By setting this value to `true`, Prism will not add its own listeners to the worker.
     *
     * You obviously have to change this value before Prism executes. To do this, you can add an
     * empty Prism object into the global scope before loading the Prism script like this:
     *
     * ```js
     * window.Prism = window.Prism || {};
     * Prism.disableWorkerMessageHandler = true;
     * // Load Prism's script
     * ```
     *
     * @default false
     * @type {boolean}
     * @memberof Prism
     * @public
     */
    disableWorkerMessageHandler: _self.Prism && _self.Prism.disableWorkerMessageHandler,

    /**
     * A namespace for utility methods.
     *
     * All function in this namespace that are not explicitly marked as _public_ are for __internal use only__ and may
     * change or disappear at any time.
     *
     * @namespace
     * @memberof Prism
     */
    util: {
      encode: function encode (tokens) {
        if (tokens instanceof Token) {
          return new Token(tokens.type, encode(tokens.content), tokens.alias);
        } else if (Array.isArray(tokens)) {
          return tokens.map(encode);
        } else {
          return tokens.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\u00a0/g, ' ');
        }
      },

      /**
       * Returns the name of the type of the given value.
       *
       * @param {any} o
       * @returns {string}
       * @example
       * type(null)      === 'Null'
       * type(undefined) === 'Undefined'
       * type(123)       === 'Number'
       * type('foo')     === 'String'
       * type(true)      === 'Boolean'
       * type([1, 2])    === 'Array'
       * type({})        === 'Object'
       * type(String)    === 'Function'
       * type(/abc+/)    === 'RegExp'
       */
      type: function (o) {
        return Object.prototype.toString.call(o).slice(8, -1);
      },

      /**
       * Returns a unique number for the given object. Later calls will still return the same number.
       *
       * @param {Object} obj
       * @returns {number}
       */
      objId: function (obj) {
        if (!obj['__id']) {
          Object.defineProperty(obj, '__id', { value: ++uniqueId });
        }
        return obj['__id'];
      },

      /**
       * Creates a deep clone of the given object.
       *
       * The main intended use of this function is to clone language definitions.
       *
       * @param {T} o
       * @param {Record<number, any>} [visited]
       * @returns {T}
       * @template T
       */
      clone: function deepClone (o, visited) {
        visited = visited || {};

        var clone;
        var id;
        switch (_.util.type(o)) {
          case 'Object':
            id = _.util.objId(o);
            if (visited[id]) {
              return visited[id];
            }
            clone = /** @type {Record<string, any>} */ ({});
            visited[id] = clone;

            for (var key in o) {
              if (o.hasOwnProperty(key)) {
                clone[key] = deepClone(o[key], visited);
              }
            }

            return /** @type {any} */ (clone);

          case 'Array':
            id = _.util.objId(o);
            if (visited[id]) {
              return visited[id];
            }
            clone = [];
            visited[id] = clone;

            (/** @type {Array} */(/** @type {any} */(o))).forEach(function (v, i) {
              clone[i] = deepClone(v, visited);
            });

            return /** @type {any} */ (clone);

          default:
            return o;
        }
      },

      /**
       * Returns the Prism language of the given element set by a `language-xxxx` or `lang-xxxx` class.
       *
       * If no language is set for the element or the element is `null` or `undefined`, `none` will be returned.
       *
       * @param {Element} element
       * @returns {string}
       */
      getLanguage: function (element) {
        while (element) {
          var m = lang.exec(element.className);
          if (m) {
            return m[1].toLowerCase();
          }
          element = element.parentElement;
        }
        return 'none';
      },

      /**
       * Sets the Prism `language-xxxx` class of the given element.
       *
       * @param {Element} element
       * @param {string} language
       * @returns {void}
       */
      setLanguage: function (element, language) {
        // remove all `language-xxxx` classes
        // (this might leave behind a leading space)
        element.className = element.className.replace(RegExp(lang, 'gi'), '');

        // add the new `language-xxxx` class
        // (using `classList` will automatically clean up spaces for us)
        element.classList.add('language-' + language);
      },

      /**
       * Returns the script element that is currently executing.
       *
       * This does __not__ work for line script element.
       *
       * @returns {HTMLScriptElement | null}
       */
      currentScript: function () {
        if (typeof document === 'undefined') {
          return null;
        }
        if ('currentScript' in document && 1 < 2 /* hack to trip TS' flow analysis */) {
          return /** @type {any} */ (document.currentScript);
        }

        // IE11 workaround
        // we'll get the src of the current script by parsing IE11's error stack trace
        // this will not work for inline scripts

        try {
          throw new Error();
        } catch (err) {
          // Get file src url from stack. Specifically works with the format of stack traces in IE.
          // A stack will look like this:
          //
          // Error
          //    at _.util.currentScript (http://localhost/components/prism-core.js:119:5)
          //    at Global code (http://localhost/components/prism-core.js:606:1)

          var src = (/at [^(\r\n]*\((.*):[^:]+:[^:]+\)$/i.exec(err.stack) || [])[1];
          if (src) {
            var scripts = document.getElementsByTagName('script');
            for (var i in scripts) {
              if (scripts[i].src == src) {
                return scripts[i];
              }
            }
          }
          return null;
        }
      },

      /**
       * Returns whether a given class is active for `element`.
       *
       * The class can be activated if `element` or one of its ancestors has the given class and it can be deactivated
       * if `element` or one of its ancestors has the negated version of the given class. The _negated version_ of the
       * given class is just the given class with a `no-` prefix.
       *
       * Whether the class is active is determined by the closest ancestor of `element` (where `element` itself is
       * closest ancestor) that has the given class or the negated version of it. If neither `element` nor any of its
       * ancestors have the given class or the negated version of it, then the default activation will be returned.
       *
       * In the paradoxical situation where the closest ancestor contains __both__ the given class and the negated
       * version of it, the class is considered active.
       *
       * @param {Element} element
       * @param {string} className
       * @param {boolean} [defaultActivation=false]
       * @returns {boolean}
       */
      isActive: function (element, className, defaultActivation) {
        var no = 'no-' + className;

        while (element) {
          var classList = element.classList;
          if (classList.contains(className)) {
            return true;
          }
          if (classList.contains(no)) {
            return false;
          }
          element = element.parentElement;
        }
        return !!defaultActivation;
      },
    },

    /**
     * This namespace contains all currently loaded languages and the some helper functions to create and modify languages.
     *
     * @namespace
     * @memberof Prism
     * @public
     */
    languages: {
      /**
       * The grammar for plain, unformatted text.
       */
      plain: plainTextGrammar,
      plaintext: plainTextGrammar,
      text: plainTextGrammar,
      txt: plainTextGrammar,

      /**
       * Creates a deep copy of the language with the given id and appends the given tokens.
       *
       * If a token in `redef` also appears in the copied language, then the existing token in the copied language
       * will be overwritten at its original position.
       *
       * ## Best practices
       *
       * Since the position of overwriting tokens (token in `redef` that overwrite tokens in the copied language)
       * doesn't matter, they can technically be in any order. However, this can be confusing to others that trying to
       * understand the language definition because, normally, the order of tokens matters in Prism grammars.
       *
       * Therefore, it is encouraged to order overwriting tokens according to the positions of the overwritten tokens.
       * Furthermore, all non-overwriting tokens should be placed after the overwriting ones.
       *
       * @param {string} id The id of the language to extend. This has to be a key in `Prism.languages`.
       * @param {Grammar} redef The new tokens to append.
       * @returns {Grammar} The new language created.
       * @public
       * @example
       * Prism.languages['css-with-colors'] = Prism.languages.extend('css', {
       *     // Prism.languages.css already has a 'comment' token, so this token will overwrite CSS' 'comment' token
       *     // at its original position
       *     'comment': { ... },
       *     // CSS doesn't have a 'color' token, so this token will be appended
       *     'color': /\b(?:red|green|blue)\b/
       * });
       */
      extend: function (id, redef) {
        var lang = _.util.clone(_.languages[id]);

        for (var key in redef) {
          lang[key] = redef[key];
        }

        return lang;
      },

      /**
       * Inserts tokens _before_ another token in a language definition or any other grammar.
       *
       * ## Usage
       *
       * This helper method makes it easy to modify existing languages. For example, the CSS language definition
       * not only defines CSS highlighting for CSS documents, but also needs to define highlighting for CSS embedded
       * in HTML through `<style>` elements. To do this, it needs to modify `Prism.languages.markup` and add the
       * appropriate tokens. However, `Prism.languages.markup` is a regular JavaScript object literal, so if you do
       * this:
       *
       * ```js
       * Prism.languages.markup.style = {
       *     // token
       * };
       * ```
       *
       * then the `style` token will be added (and processed) at the end. `insertBefore` allows you to insert tokens
       * before existing tokens. For the CSS example above, you would use it like this:
       *
       * ```js
       * Prism.languages.insertBefore('markup', 'cdata', {
       *     'style': {
       *         // token
       *     }
       * });
       * ```
       *
       * ## Special cases
       *
       * If the grammars of `inside` and `insert` have tokens with the same name, the tokens in `inside`'s grammar
       * will be ignored.
       *
       * This behavior can be used to insert tokens after `before`:
       *
       * ```js
       * Prism.languages.insertBefore('markup', 'comment', {
       *     'comment': Prism.languages.markup.comment,
       *     // tokens after 'comment'
       * });
       * ```
       *
       * ## Limitations
       *
       * The main problem `insertBefore` has to solve is iteration order. Since ES2015, the iteration order for object
       * properties is guaranteed to be the insertion order (except for integer keys) but some browsers behave
       * differently when keys are deleted and re-inserted. So `insertBefore` can't be implemented by temporarily
       * deleting properties which is necessary to insert at arbitrary positions.
       *
       * To solve this problem, `insertBefore` doesn't actually insert the given tokens into the target object.
       * Instead, it will create a new object and replace all references to the target object with the new one. This
       * can be done without temporarily deleting properties, so the iteration order is well-defined.
       *
       * However, only references that can be reached from `Prism.languages` or `insert` will be replaced. I.e. if
       * you hold the target object in a variable, then the value of the variable will not change.
       *
       * ```js
       * var oldMarkup = Prism.languages.markup;
       * var newMarkup = Prism.languages.insertBefore('markup', 'comment', { ... });
       *
       * assert(oldMarkup !== Prism.languages.markup);
       * assert(newMarkup === Prism.languages.markup);
       * ```
       *
       * @param {string} inside The property of `root` (e.g. a language id in `Prism.languages`) that contains the
       * object to be modified.
       * @param {string} before The key to insert before.
       * @param {Grammar} insert An object containing the key-value pairs to be inserted.
       * @param {Object<string, any>} [root] The object containing `inside`, i.e. the object that contains the
       * object to be modified.
       *
       * Defaults to `Prism.languages`.
       * @returns {Grammar} The new grammar object.
       * @public
       */
      insertBefore: function (inside, before, insert, root) {
        root = root || /** @type {any} */ (_.languages);
        var grammar = root[inside];
        /** @type {Grammar} */
        var ret = {};

        for (var token in grammar) {
          if (grammar.hasOwnProperty(token)) {

            if (token == before) {
              for (var newToken in insert) {
                if (insert.hasOwnProperty(newToken)) {
                  ret[newToken] = insert[newToken];
                }
              }
            }

            // Do not insert token which also occur in insert. See #1525
            if (!insert.hasOwnProperty(token)) {
              ret[token] = grammar[token];
            }
          }
        }

        var old = root[inside];
        root[inside] = ret;

        // Update references in other language definitions
        _.languages.DFS(_.languages, function (key, value) {
          if (value === old && key != inside) {
            this[key] = ret;
          }
        });

        return ret;
      },

      // Traverse a language definition with Depth First Search
      DFS: function DFS (o, callback, type, visited) {
        visited = visited || {};

        var objId = _.util.objId;

        for (var i in o) {
          if (o.hasOwnProperty(i)) {
            callback.call(o, i, o[i], type || i);

            var property = o[i];
            var propertyType = _.util.type(property);

            if (propertyType === 'Object' && !visited[objId(property)]) {
              visited[objId(property)] = true;
              DFS(property, callback, null, visited);
            } else if (propertyType === 'Array' && !visited[objId(property)]) {
              visited[objId(property)] = true;
              DFS(property, callback, i, visited);
            }
          }
        }
      },
    },

    plugins: {},

    /**
     * This is the most high-level function in Prism’s API.
     * It fetches all the elements that have a `.language-xxxx` class and then calls {@link Prism.highlightElement} on
     * each one of them.
     *
     * This is equivalent to `Prism.highlightAllUnder(document, async, callback)`.
     *
     * @param {boolean} [async=false] Same as in {@link Prism.highlightAllUnder}.
     * @param {HighlightCallback} [callback] Same as in {@link Prism.highlightAllUnder}.
     * @memberof Prism
     * @public
     */
    highlightAll: function (async, callback) {
      _.highlightAllUnder(document, async, callback);
    },

    /**
     * Fetches all the descendants of `container` that have a `.language-xxxx` class and then calls
     * {@link Prism.highlightElement} on each one of them.
     *
     * The following hooks will be run:
     * 1. `before-highlightall`
     * 2. `before-all-elements-highlight`
     * 3. All hooks of {@link Prism.highlightElement} for each element.
     *
     * @param {ParentNode} container The root element, whose descendants that have a `.language-xxxx` class will be highlighted.
     * @param {boolean} [async=false] Whether each element is to be highlighted asynchronously using Web Workers.
     * @param {HighlightCallback} [callback] An optional callback to be invoked on each element after its highlighting is done.
     * @memberof Prism
     * @public
     */
    highlightAllUnder: function (container, async, callback) {
      var env = {
        callback: callback,
        container: container,
        selector: 'code[class*="language-"], [class*="language-"] code, code[class*="lang-"], [class*="lang-"] code',
      };

      _.hooks.run('before-highlightall', env);

      env.elements = Array.prototype.slice.apply(env.container.querySelectorAll(env.selector));

      _.hooks.run('before-all-elements-highlight', env);

      for (var i = 0, element; (element = env.elements[i++]);) {
        _.highlightElement(element, async === true, env.callback);
      }
    },

    /**
     * Highlights the code inside a single element.
     *
     * The following hooks will be run:
     * 1. `before-sanity-check`
     * 2. `before-highlight`
     * 3. All hooks of {@link Prism.highlight}. These hooks will be run by an asynchronous worker if `async` is `true`.
     * 4. `before-insert`
     * 5. `after-highlight`
     * 6. `complete`
     *
     * Some the above hooks will be skipped if the element doesn't contain any text or there is no grammar loaded for
     * the element's language.
     *
     * @param {Element} element The element containing the code.
     * It must have a class of `language-xxxx` to be processed, where `xxxx` is a valid language identifier.
     * @param {boolean} [async=false] Whether the element is to be highlighted asynchronously using Web Workers
     * to improve performance and avoid blocking the UI when highlighting very large chunks of code. This option is
     * [disabled by default](https://prismjs.com/faq.html#why-is-asynchronous-highlighting-disabled-by-default).
     *
     * Note: All language definitions required to highlight the code must be included in the main `prism.js` file for
     * asynchronous highlighting to work. You can build your own bundle on the
     * [Download page](https://prismjs.com/download.html).
     * @param {HighlightCallback} [callback] An optional callback to be invoked after the highlighting is done.
     * Mostly useful when `async` is `true`, since in that case, the highlighting is done asynchronously.
     * @memberof Prism
     * @public
     */
    highlightElement: function (element, async, callback) {
      // Find language
      var language = _.util.getLanguage(element);
      var grammar = _.languages[language];

      // Set language on the element, if not present
      _.util.setLanguage(element, language);

      // Set language on the parent, for styling
      var parent = element.parentElement;
      if (parent && parent.nodeName.toLowerCase() === 'pre') {
        _.util.setLanguage(parent, language);
      }

      var code = element.textContent;

      var env = {
        element: element,
        language: language,
        grammar: grammar,
        code: code,
      };

      function insertHighlightedCode (highlightedCode) {
        env.highlightedCode = highlightedCode;

        _.hooks.run('before-insert', env);

        env.element.innerHTML = env.highlightedCode;

        _.hooks.run('after-highlight', env);
        _.hooks.run('complete', env);
        callback && callback.call(env.element);
      }

      _.hooks.run('before-sanity-check', env);

      // plugins may change/add the parent/element
      parent = env.element.parentElement;
      if (parent && parent.nodeName.toLowerCase() === 'pre' && !parent.hasAttribute('tabindex')) {
        parent.setAttribute('tabindex', '0');
      }

      if (!env.code) {
        _.hooks.run('complete', env);
        callback && callback.call(env.element);
        return;
      }

      _.hooks.run('before-highlight', env);

      if (!env.grammar) {
        insertHighlightedCode(_.util.encode(env.code));
        return;
      }

      if (async && _self.Worker) {
        var worker = new Worker(_.filename);

        worker.onmessage = function (evt) {
          insertHighlightedCode(evt.data);
        };

        worker.postMessage(JSON.stringify({
          language: env.language,
          code: env.code,
          immediateClose: true,
        }));
      } else {
        insertHighlightedCode(_.highlight(env.code, env.grammar, env.language));
      }
    },

    /**
     * Low-level function, only use if you know what you’re doing. It accepts a string of text as input
     * and the language definitions to use, and returns a string with the HTML produced.
     *
     * The following hooks will be run:
     * 1. `before-tokenize`
     * 2. `after-tokenize`
     * 3. `wrap`: On each {@link Token}.
     *
     * @param {string} text A string with the code to be highlighted.
     * @param {Grammar} grammar An object containing the tokens to use.
     *
     * Usually a language definition like `Prism.languages.markup`.
     * @param {string} language The name of the language definition passed to `grammar`.
     * @returns {string} The highlighted HTML.
     * @memberof Prism
     * @public
     * @example
     * Prism.highlight('var foo = true;', Prism.languages.javascript, 'javascript');
     */
    highlight: function (text, grammar, language) {
      var env = {
        code: text,
        grammar: grammar,
        language: language,
      };
      _.hooks.run('before-tokenize', env);
      if (!env.grammar) {
        throw new Error('The language "' + env.language + '" has no grammar.');
      }
      env.tokens = _.tokenize(env.code, env.grammar);
      _.hooks.run('after-tokenize', env);
      return Token.stringify(_.util.encode(env.tokens), env.language);
    },

    /**
     * This is the heart of Prism, and the most low-level function you can use. It accepts a string of text as input
     * and the language definitions to use, and returns an array with the tokenized code.
     *
     * When the language definition includes nested tokens, the function is called recursively on each of these tokens.
     *
     * This method could be useful in other contexts as well, as a very crude parser.
     *
     * @param {string} text A string with the code to be highlighted.
     * @param {Grammar} grammar An object containing the tokens to use.
     *
     * Usually a language definition like `Prism.languages.markup`.
     * @returns {TokenStream} An array of strings and tokens, a token stream.
     * @memberof Prism
     * @public
     * @example
     * let code = `var foo = 0;`;
     * let tokens = Prism.tokenize(code, Prism.languages.javascript);
     * tokens.forEach(token => {
     *     if (token instanceof Prism.Token && token.type === 'number') {
     *         console.log(`Found numeric literal: ${token.content}`);
     *     }
     * });
     */
    tokenize: function (text, grammar) {
      var rest = grammar.rest;
      if (rest) {
        for (var token in rest) {
          grammar[token] = rest[token];
        }

        delete grammar.rest;
      }

      var tokenList = new LinkedList();
      addAfter(tokenList, tokenList.head, text);

      matchGrammar(text, tokenList, grammar, tokenList.head, 0);

      return toArray(tokenList);
    },

    /**
     * @namespace
     * @memberof Prism
     * @public
     */
    hooks: {
      all: {},

      /**
       * Adds the given callback to the list of callbacks for the given hook.
       *
       * The callback will be invoked when the hook it is registered for is run.
       * Hooks are usually directly run by a highlight function but you can also run hooks yourself.
       *
       * One callback function can be registered to multiple hooks and the same hook multiple times.
       *
       * @param {string} name The name of the hook.
       * @param {HookCallback} callback The callback function which is given environment variables.
       * @public
       */
      add: function (name, callback) {
        var hooks = _.hooks.all;

        hooks[name] = hooks[name] || [];

        hooks[name].push(callback);
      },

      /**
       * Runs a hook invoking all registered callbacks with the given environment variables.
       *
       * Callbacks will be invoked synchronously and in the order in which they were registered.
       *
       * @param {string} name The name of the hook.
       * @param {Object<string, any>} env The environment variables of the hook passed to all callbacks registered.
       * @public
       */
      run: function (name, env) {
        var callbacks = _.hooks.all[name];

        if (!callbacks || !callbacks.length) {
          return;
        }

        for (var i = 0, callback; (callback = callbacks[i++]);) {
          callback(env);
        }
      },
    },

    Token: Token,
  };
  _self.Prism = _;

  // Typescript note:
  // The following can be used to import the Token type in JSDoc:
  //
  //   @typedef {InstanceType<import("./prism-core")["Token"]>} Token

  /**
   * Creates a new token.
   *
   * @param {string} type See {@link Token#type type}
   * @param {string | TokenStream} content See {@link Token#content content}
   * @param {string|string[]} [alias] The alias(es) of the token.
   * @param {string} [matchedStr=""] A copy of the full string this token was created from.
   * @class
   * @global
   * @public
   */
  function Token (type, content, alias, matchedStr) {
    /**
     * The type of the token.
     *
     * This is usually the key of a pattern in a {@link Grammar}.
     *
     * @type {string}
     * @see GrammarToken
     * @public
     */
    this.type = type;
    /**
     * The strings or tokens contained by this token.
     *
     * This will be a token stream if the pattern matched also defined an `inside` grammar.
     *
     * @type {string | TokenStream}
     * @public
     */
    this.content = content;
    /**
     * The alias(es) of the token.
     *
     * @type {string|string[]}
     * @see GrammarToken
     * @public
     */
    this.alias = alias;
    // Copy of the full string this token was created from
    this.length = (matchedStr || '').length | 0;
  }

  /**
   * A token stream is an array of strings and {@link Token Token} objects.
   *
   * Token streams have to fulfill a few properties that are assumed by most functions (mostly internal ones) that process
   * them.
   *
   * 1. No adjacent strings.
   * 2. No empty strings.
   *
   *    The only exception here is the token stream that only contains the empty string and nothing else.
   *
   * @typedef {Array<string | Token>} TokenStream
   * @global
   * @public
   */

  /**
   * Converts the given token or token stream to an HTML representation.
   *
   * The following hooks will be run:
   * 1. `wrap`: On each {@link Token}.
   *
   * @param {string | Token | TokenStream} o The token or token stream to be converted.
   * @param {string} language The name of current language.
   * @returns {string} The HTML representation of the token or token stream.
   * @memberof Token
   * @static
   */
  Token.stringify = function stringify (o, language) {
    if (typeof o == 'string') {
      return o;
    }
    if (Array.isArray(o)) {
      var s = '';
      o.forEach(function (e) {
        s += stringify(e, language);
      });
      return s;
    }

    var env = {
      type: o.type,
      content: stringify(o.content, language),
      tag: 'span',
      classes: ['token', o.type],
      attributes: {},
      language: language,
    };

    var aliases = o.alias;
    if (aliases) {
      if (Array.isArray(aliases)) {
        Array.prototype.push.apply(env.classes, aliases);
      } else {
        env.classes.push(aliases);
      }
    }

    _.hooks.run('wrap', env);

    var attributes = '';
    for (var name in env.attributes) {
      attributes += ' ' + name + '="' + (env.attributes[name] || '').replace(/"/g, '&quot;') + '"';
    }

    return '<' + env.tag + ' class="' + env.classes.join(' ') + '"' + attributes + '>' + env.content + '</' + env.tag +
      '>';
  };

  /**
   * @param {RegExp} pattern
   * @param {number} pos
   * @param {string} text
   * @param {boolean} lookbehind
   * @returns {RegExpExecArray | null}
   */
  function matchPattern (pattern, pos, text, lookbehind) {
    pattern.lastIndex = pos;
    var match = pattern.exec(text);
    if (match && lookbehind && match[1]) {
      // change the match to remove the text matched by the Prism lookbehind group
      var lookbehindLength = match[1].length;
      match.index += lookbehindLength;
      match[0] = match[0].slice(lookbehindLength);
    }
    return match;
  }

  /**
   * @param {string} text
   * @param {LinkedList<string | Token>} tokenList
   * @param {any} grammar
   * @param {LinkedListNode<string | Token>} startNode
   * @param {number} startPos
   * @param {RematchOptions} [rematch]
   * @returns {void}
   * @private
   *
   * @typedef RematchOptions
   * @property {string} cause
   * @property {number} reach
   */
  function matchGrammar (text, tokenList, grammar, startNode, startPos, rematch) {
    for (var token in grammar) {
      if (!grammar.hasOwnProperty(token) || !grammar[token]) {
        continue;
      }

      var patterns = grammar[token];
      patterns = Array.isArray(patterns) ? patterns : [patterns];

      for (var j = 0; j < patterns.length; ++j) {
        if (rematch && rematch.cause == token + ',' + j) {
          return;
        }

        var patternObj = patterns[j];
        var inside = patternObj.inside;
        var lookbehind = !!patternObj.lookbehind;
        var greedy = !!patternObj.greedy;
        var alias = patternObj.alias;

        if (greedy && !patternObj.pattern.global) {
          // Without the global flag, lastIndex won't work
          var flags = patternObj.pattern.toString().match(/[imsuy]*$/)[0];
          patternObj.pattern = RegExp(patternObj.pattern.source, flags + 'g');
        }

        /** @type {RegExp} */
        var pattern = patternObj.pattern || patternObj;

        for ( // iterate the token list and keep track of the current token/string position
          var currentNode = startNode.next, pos = startPos;
          currentNode !== tokenList.tail;
          pos += currentNode.value.length, currentNode = currentNode.next
        ) {

          if (rematch && pos >= rematch.reach) {
            break;
          }

          var str = currentNode.value;

          if (tokenList.length > text.length) {
            // Something went terribly wrong, ABORT, ABORT!
            return;
          }

          if (str instanceof Token) {
            continue;
          }

          var removeCount = 1; // this is the to parameter of removeBetween
          var match;

          if (greedy) {
            match = matchPattern(pattern, pos, text, lookbehind);
            if (!match || match.index >= text.length) {
              break;
            }

            var from = match.index;
            var to = match.index + match[0].length;
            var p = pos;

            // find the node that contains the match
            p += currentNode.value.length;
            while (from >= p) {
              currentNode = currentNode.next;
              p += currentNode.value.length;
            }
            // adjust pos (and p)
            p -= currentNode.value.length;
            pos = p;

            // the current node is a Token, then the match starts inside another Token, which is invalid
            if (currentNode.value instanceof Token) {
              continue;
            }

            // find the last node which is affected by this match
            for (
              var k = currentNode;
              k !== tokenList.tail && (p < to || typeof k.value === 'string');
              k = k.next
            ) {
              removeCount++;
              p += k.value.length;
            }
            removeCount--;

            // replace with the new match
            str = text.slice(pos, p);
            match.index -= pos;
          } else {
            match = matchPattern(pattern, 0, str, lookbehind);
            if (!match) {
              continue;
            }
          }

          // eslint-disable-next-line no-redeclare
          var from = match.index;
          var matchStr = match[0];
          var before = str.slice(0, from);
          var after = str.slice(from + matchStr.length);

          var reach = pos + str.length;
          if (rematch && reach > rematch.reach) {
            rematch.reach = reach;
          }

          var removeFrom = currentNode.prev;

          if (before) {
            removeFrom = addAfter(tokenList, removeFrom, before);
            pos += before.length;
          }

          removeRange(tokenList, removeFrom, removeCount);

          var wrapped = new Token(token, inside ? _.tokenize(matchStr, inside) : matchStr, alias, matchStr);
          currentNode = addAfter(tokenList, removeFrom, wrapped);

          if (after) {
            addAfter(tokenList, currentNode, after);
          }

          if (removeCount > 1) {
            // at least one Token object was removed, so we have to do some rematching
            // this can only happen if the current pattern is greedy

            /** @type {RematchOptions} */
            var nestedRematch = {
              cause: token + ',' + j,
              reach: reach,
            };
            matchGrammar(text, tokenList, grammar, currentNode.prev, pos, nestedRematch);

            // the reach might have been extended because of the rematching
            if (rematch && nestedRematch.reach > rematch.reach) {
              rematch.reach = nestedRematch.reach;
            }
          }
        }
      }
    }
  }

  /**
   * @typedef LinkedListNode
   * @property {T} value
   * @property {LinkedListNode<T> | null} prev The previous node.
   * @property {LinkedListNode<T> | null} next The next node.
   * @template T
   * @private
   */

  /**
   * @template T
   * @private
   */
  function LinkedList () {
    /** @type {LinkedListNode<T>} */
    var head = { value: null, prev: null, next: null };
    /** @type {LinkedListNode<T>} */
    var tail = { value: null, prev: head, next: null };
    head.next = tail;

    /** @type {LinkedListNode<T>} */
    this.head = head;
    /** @type {LinkedListNode<T>} */
    this.tail = tail;
    this.length = 0;
  }

  /**
   * Adds a new node with the given value to the list.
   *
   * @param {LinkedList<T>} list
   * @param {LinkedListNode<T>} node
   * @param {T} value
   * @returns {LinkedListNode<T>} The added node.
   * @template T
   */
  function addAfter (list, node, value) {
    // assumes that node != list.tail && values.length >= 0
    var next = node.next;

    var newNode = { value: value, prev: node, next: next };
    node.next = newNode;
    next.prev = newNode;
    list.length++;

    return newNode;
  }

  /**
   * Removes `count` nodes after the given node. The given node will not be removed.
   *
   * @param {LinkedList<T>} list
   * @param {LinkedListNode<T>} node
   * @param {number} count
   * @template T
   */
  function removeRange (list, node, count) {
    var next = node.next;
    for (var i = 0; i < count && next !== list.tail; i++) {
      next = next.next;
    }
    node.next = next;
    next.prev = node;
    list.length -= i;
  }

  /**
   * @param {LinkedList<T>} list
   * @returns {T[]}
   * @template T
   */
  function toArray (list) {
    var array = [];
    var node = list.head.next;
    while (node !== list.tail) {
      array.push(node.value);
      node = node.next;
    }
    return array;
  }

  if (!_self.document) {
    if (!_self.addEventListener) {
      // in Node.js
      return _;
    }

    if (!_.disableWorkerMessageHandler) {
      // In worker
      _self.addEventListener('message', function (evt) {
        var message = JSON.parse(evt.data);
        var lang = message.language;
        var code = message.code;
        var immediateClose = message.immediateClose;

        _self.postMessage(_.highlight(code, _.languages[lang], lang));
        if (immediateClose) {
          _self.close();
        }
      }, false);
    }

    return _;
  }

  // Get current script and highlight
  var script = _.util.currentScript();

  if (script) {
    _.filename = script.src;

    if (script.hasAttribute('data-manual')) {
      _.manual = true;
    }
  }

  function highlightAutomaticallyCallback () {
    if (!_.manual) {
      _.highlightAll();
    }
  }

  if (!_.manual) {
    // If the document state is "loading", then we'll use DOMContentLoaded.
    // If the document state is "interactive" and the prism.js script is deferred, then we'll also use the
    // DOMContentLoaded event because there might be some plugins or languages which have also been deferred and they
    // might take longer one animation frame to execute which can create a race condition where only some plugins have
    // been loaded when Prism.highlightAll() is executed, depending on how fast resources are loaded.
    // See https://github.com/PrismJS/prism/issues/2102
    var readyState = document.readyState;
    if (readyState === 'loading' || readyState === 'interactive' && script && script.defer) {
      document.addEventListener('DOMContentLoaded', highlightAutomaticallyCallback);
    } else {
      if (window.requestAnimationFrame) {
        window.requestAnimationFrame(highlightAutomaticallyCallback);
      } else {
        window.setTimeout(highlightAutomaticallyCallback, 16);
      }
    }
  }

  return _;

}(_self));

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Prism;
}

// hack for components to work correctly in node.js
if (typeof global !== 'undefined') {
  global.Prism = Prism;
}

// some additional documentation/types

/**
 * The expansion of a simple `RegExp` literal to support additional properties.
 *
 * @typedef GrammarToken
 * @property {RegExp} pattern The regular expression of the token.
 * @property {boolean} [lookbehind=false] If `true`, then the first capturing group of `pattern` will (effectively)
 * behave as a lookbehind group meaning that the captured text will not be part of the matched text of the new token.
 * @property {boolean} [greedy=false] Whether the token is greedy.
 * @property {string|string[]} [alias] An optional alias or list of aliases.
 * @property {Grammar} [inside] The nested grammar of this token.
 *
 * The `inside` grammar will be used to tokenize the text value of each token of this kind.
 *
 * This can be used to make nested and even recursive language definitions.
 *
 * Note: This can cause infinite recursion. Be careful when you embed different languages or even the same language into
 * each another.
 * @global
 * @public
 */

/**
 * @typedef Grammar
 * @type {Object<string, RegExp | GrammarToken | Array<RegExp | GrammarToken>>}
 * @property {Grammar} [rest] An optional grammar object that will be appended to this grammar.
 * @global
 * @public
 */

/**
 * A function which will invoked after an element was successfully highlighted.
 *
 * @callback HighlightCallback
 * @param {Element} element The element successfully highlighted.
 * @returns {void}
 * @global
 * @public
 */

/**
 * @callback HookCallback
 * @param {Object<string, any>} env The environment variables of the hook.
 * @returns {void}
 * @global
 * @public
 */
;
Prism.languages.markup = {
  'comment': {
    pattern: /<!--(?:(?!<!--)[\s\S])*?-->/,
    greedy: true,
  },
  'prolog': {
    pattern: /<\?[\s\S]+?\?>/,
    greedy: true,
  },
  'doctype': {
    // https://www.w3.org/TR/xml/#NT-doctypedecl
    pattern: /<!DOCTYPE(?:[^>"'[\]]|"[^"]*"|'[^']*')+(?:\[(?:[^<"'\]]|"[^"]*"|'[^']*'|<(?!!--)|<!--(?:[^-]|-(?!->))*-->)*\]\s*)?>/i,
    greedy: true,
    inside: {
      'internal-subset': {
        pattern: /(^[^\[]*\[)[\s\S]+(?=\]>$)/,
        lookbehind: true,
        greedy: true,
        inside: null, // see below
      },
      'string': {
        pattern: /"[^"]*"|'[^']*'/,
        greedy: true,
      },
      'punctuation': /^<!|>$|[[\]]/,
      'doctype-tag': /^DOCTYPE/i,
      'name': /[^\s<>'"]+/,
    },
  },
  'cdata': {
    pattern: /<!\[CDATA\[[\s\S]*?\]\]>/i,
    greedy: true,
  },
  'tag': {
    pattern: /<\/?(?!\d)[^\s>\/=$<%]+(?:\s(?:\s*[^\s>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+(?=[\s>]))|(?=[\s/>])))+)?\s*\/?>/,
    greedy: true,
    inside: {
      'tag': {
        pattern: /^<\/?[^\s>\/]+/,
        inside: {
          'punctuation': /^<\/?/,
          'namespace': /^[^\s>\/:]+:/,
        },
      },
      'special-attr': [],
      'attr-value': {
        pattern: /=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+)/,
        inside: {
          'punctuation': [
            {
              pattern: /^=/,
              alias: 'attr-equals',
            },
            {
              pattern: /^(\s*)["']|["']$/,
              lookbehind: true,
            },
          ],
        },
      },
      'punctuation': /\/?>/,
      'attr-name': {
        pattern: /[^\s>\/]+/,
        inside: {
          'namespace': /^[^\s>\/:]+:/,
        },
      },

    },
  },
  'entity': [
    {
      pattern: /&[\da-z]{1,8};/i,
      alias: 'named-entity',
    },
    /&#x?[\da-f]{1,8};/i,
  ],
};

Prism.languages.markup['tag'].inside['attr-value'].inside['entity'] =
  Prism.languages.markup['entity'];
Prism.languages.markup['doctype'].inside['internal-subset'].inside = Prism.languages.markup;

// Plugin to make entity title show the real entity, idea by Roman Komarov
Prism.hooks.add('wrap', function (env) {

  if (env.type === 'entity') {
    env.attributes['title'] = env.content.replace(/&amp;/, '&');
  }
});

Object.defineProperty(Prism.languages.markup.tag, 'addInlined', {
  /**
   * Adds an inlined language to markup.
   *
   * An example of an inlined language is CSS with `<style>` tags.
   *
   * @param {string} tagName The name of the tag that contains the inlined language. This name will be treated as
   * case insensitive.
   * @param {string} lang The language key.
   * @example
   * addInlined('style', 'css');
   */
  value: function addInlined (tagName, lang) {
    var includedCdataInside = {};
    includedCdataInside['language-' + lang] = {
      pattern: /(^<!\[CDATA\[)[\s\S]+?(?=\]\]>$)/i,
      lookbehind: true,
      inside: Prism.languages[lang],
    };
    includedCdataInside['cdata'] = /^<!\[CDATA\[|\]\]>$/i;

    var inside = {
      'included-cdata': {
        pattern: /<!\[CDATA\[[\s\S]*?\]\]>/i,
        inside: includedCdataInside,
      },
    };
    inside['language-' + lang] = {
      pattern: /[\s\S]+/,
      inside: Prism.languages[lang],
    };

    var def = {};
    def[tagName] = {
      pattern: RegExp(
        /(<__[^>]*>)(?:<!\[CDATA\[(?:[^\]]|\](?!\]>))*\]\]>|(?!<!\[CDATA\[)[\s\S])*?(?=<\/__>)/.source.replace(/__/g,
          function () { return tagName; }), 'i'),
      lookbehind: true,
      greedy: true,
      inside: inside,
    };

    Prism.languages.insertBefore('markup', 'cdata', def);
  },
});
Object.defineProperty(Prism.languages.markup.tag, 'addAttribute', {
  /**
   * Adds an pattern to highlight languages embedded in HTML attributes.
   *
   * An example of an inlined language is CSS with `style` attributes.
   *
   * @param {string} attrName The name of the tag that contains the inlined language. This name will be treated as
   * case insensitive.
   * @param {string} lang The language key.
   * @example
   * addAttribute('style', 'css');
   */
  value: function (attrName, lang) {
    Prism.languages.markup.tag.inside['special-attr'].push({
      pattern: RegExp(
        /(^|["'\s])/.source + '(?:' + attrName + ')' + /\s*=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+(?=[\s>]))/.source,
        'i',
      ),
      lookbehind: true,
      inside: {
        'attr-name': /^[^\s=]+/,
        'attr-value': {
          pattern: /=[\s\S]+/,
          inside: {
            'value': {
              pattern: /(^=\s*(["']|(?!["'])))\S[\s\S]*(?=\2$)/,
              lookbehind: true,
              alias: [lang, 'language-' + lang],
              inside: Prism.languages[lang],
            },
            'punctuation': [
              {
                pattern: /^=/,
                alias: 'attr-equals',
              },
              /"|'/,
            ],
          },
        },
      },
    });
  },
});

Prism.languages.html = Prism.languages.markup;
Prism.languages.mathml = Prism.languages.markup;
Prism.languages.svg = Prism.languages.markup;

Prism.languages.xml = Prism.languages.extend('markup', {});
Prism.languages.ssml = Prism.languages.xml;
Prism.languages.atom = Prism.languages.xml;
Prism.languages.rss = Prism.languages.xml;

(function (Prism) {

  var string = /(?:"(?:\\(?:\r\n|[\s\S])|[^"\\\r\n])*"|'(?:\\(?:\r\n|[\s\S])|[^'\\\r\n])*')/;

  Prism.languages.css = {
    'comment': /\/\*[\s\S]*?\*\//,
    'atrule': {
      pattern: RegExp(
        '@[\\w-](?:' + /[^;{\s"']|\s+(?!\s)/.source + '|' + string.source + ')*?' + /(?:;|(?=\s*\{))/.source),
      inside: {
        'rule': /^@[\w-]+/,
        'selector-function-argument': {
          pattern: /(\bselector\s*\(\s*(?![\s)]))(?:[^()\s]|\s+(?![\s)])|\((?:[^()]|\([^()]*\))*\))+(?=\s*\))/,
          lookbehind: true,
          alias: 'selector',
        },
        'keyword': {
          pattern: /(^|[^\w-])(?:and|not|only|or)(?![\w-])/,
          lookbehind: true,
        },
        // See rest below
      },
    },
    'url': {
      // https://drafts.csswg.org/css-values-3/#urls
      pattern: RegExp('\\burl\\((?:' + string.source + '|' + /(?:[^\\\r\n()"']|\\[\s\S])*/.source + ')\\)', 'i'),
      greedy: true,
      inside: {
        'function': /^url/i,
        'punctuation': /^\(|\)$/,
        'string': {
          pattern: RegExp('^' + string.source + '$'),
          alias: 'url',
        },
      },
    },
    'selector': {
      pattern: RegExp('(^|[{}\\s])[^{}\\s](?:[^{};"\'\\s]|\\s+(?![\\s{])|' + string.source + ')*(?=\\s*\\{)'),
      lookbehind: true,
    },
    'string': {
      pattern: string,
      greedy: true,
    },
    'property': {
      pattern: /(^|[^-\w\xA0-\uFFFF])(?!\s)[-_a-z\xA0-\uFFFF](?:(?!\s)[-\w\xA0-\uFFFF])*(?=\s*:)/i,
      lookbehind: true,
    },
    'important': /!important\b/i,
    'function': {
      pattern: /(^|[^-a-z0-9])[-a-z0-9]+(?=\()/i,
      lookbehind: true,
    },
    'punctuation': /[(){};:,]/,
  };

  Prism.languages.css['atrule'].inside.rest = Prism.languages.css;

  var markup = Prism.languages.markup;
  if (markup) {
    markup.tag.addInlined('style', 'css');
    markup.tag.addAttribute('style', 'css');
  }

}(Prism));

Prism.languages.clike = {
  'comment': [
    {
      pattern: /(^|[^\\])\/\*[\s\S]*?(?:\*\/|$)/,
      lookbehind: true,
      greedy: true,
    },
    {
      pattern: /(^|[^\\:])\/\/.*/,
      lookbehind: true,
      greedy: true,
    },
  ],
  'string': {
    pattern: /(["'])(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/,
    greedy: true,
  },
  'class-name': {
    pattern: /(\b(?:class|extends|implements|instanceof|interface|new|trait)\s+|\bcatch\s+\()[\w.\\]+/i,
    lookbehind: true,
    inside: {
      'punctuation': /[.\\]/,
    },
  },
  'keyword': /\b(?:break|catch|continue|do|else|finally|for|function|if|in|instanceof|new|null|return|throw|try|while)\b/,
  'boolean': /\b(?:false|true)\b/,
  'function': /\b\w+(?=\()/,
  'number': /\b0x[\da-f]+\b|(?:\b\d+(?:\.\d*)?|\B\.\d+)(?:e[+-]?\d+)?/i,
  'operator': /[<>]=?|[!=]=?=?|--?|\+\+?|&&?|\|\|?|[?*/~^%]/,
  'punctuation': /[{}[\];(),.:]/,
};

Prism.languages.javascript = Prism.languages.extend('clike', {
  'class-name': [
    Prism.languages.clike['class-name'],
    {
      pattern: /(^|[^$\w\xA0-\uFFFF])(?!\s)[_$A-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\.(?:constructor|prototype))/,
      lookbehind: true,
    },
  ],
  'keyword': [
    {
      pattern: /((?:^|\})\s*)catch\b/,
      lookbehind: true,
    },
    {
      pattern: /(^|[^.]|\.\.\.\s*)\b(?:as|assert(?=\s*\{)|async(?=\s*(?:function\b|\(|[$\w\xA0-\uFFFF]|$))|await|break|case|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally(?=\s*(?:\{|$))|for|from(?=\s*(?:['"]|$))|function|(?:get|set)(?=\s*(?:[#\[$\w\xA0-\uFFFF]|$))|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)\b/,
      lookbehind: true,
    },
  ],
  // Allow for all non-ASCII characters (See http://stackoverflow.com/a/2008444)
  'function': /#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*(?:\.\s*(?:apply|bind|call)\s*)?\()/,
  'number': {
    pattern: RegExp(
      /(^|[^\w$])/.source +
      '(?:' +
      (
        // constant
        /NaN|Infinity/.source +
        '|' +
        // binary integer
        /0[bB][01]+(?:_[01]+)*n?/.source +
        '|' +
        // octal integer
        /0[oO][0-7]+(?:_[0-7]+)*n?/.source +
        '|' +
        // hexadecimal integer
        /0[xX][\dA-Fa-f]+(?:_[\dA-Fa-f]+)*n?/.source +
        '|' +
        // decimal bigint
        /\d+(?:_\d+)*n/.source +
        '|' +
        // decimal number (integer or float) but no bigint
        /(?:\d+(?:_\d+)*(?:\.(?:\d+(?:_\d+)*)?)?|\.\d+(?:_\d+)*)(?:[Ee][+-]?\d+(?:_\d+)*)?/.source
      ) +
      ')' +
      /(?![\w$])/.source,
    ),
    lookbehind: true,
  },
  'operator': /--|\+\+|\*\*=?|=>|&&=?|\|\|=?|[!=]==|<<=?|>>>?=?|[-+*/%&|^!=<>]=?|\.{3}|\?\?=?|\?\.?|[~:]/,
});

Prism.languages.javascript['class-name'][0].pattern = /(\b(?:class|extends|implements|instanceof|interface|new)\s+)[\w.\\]+/;

Prism.languages.insertBefore('javascript', 'keyword', {
  'regex': {
    pattern: RegExp(
      // lookbehind
      // eslint-disable-next-line regexp/no-dupe-characters-character-class
      /((?:^|[^$\w\xA0-\uFFFF."'\])\s]|\b(?:return|yield))\s*)/.source +
      // Regex pattern:
      // There are 2 regex patterns here. The RegExp set notation proposal added support for nested character
      // classes if the `v` flag is present. Unfortunately, nested CCs are both context-free and incompatible
      // with the only syntax, so we have to define 2 different regex patterns.
      /\//.source +
      '(?:' +
      /(?:\[(?:[^\]\\\r\n]|\\.)*\]|\\.|[^/\\\[\r\n])+\/[dgimyus]{0,7}/.source +
      '|' +
      // `v` flag syntax. This supports 3 levels of nested character classes.
      /(?:\[(?:[^[\]\\\r\n]|\\.|\[(?:[^[\]\\\r\n]|\\.|\[(?:[^[\]\\\r\n]|\\.)*\])*\])*\]|\\.|[^/\\\[\r\n])+\/[dgimyus]{0,7}v[dgimyus]{0,7}/.source +
      ')' +
      // lookahead
      /(?=(?:\s|\/\*(?:[^*]|\*(?!\/))*\*\/)*(?:$|[\r\n,.;:})\]]|\/\/))/.source,
    ),
    lookbehind: true,
    greedy: true,
    inside: {
      'regex-source': {
        pattern: /^(\/)[\s\S]+(?=\/[a-z]*$)/,
        lookbehind: true,
        alias: 'language-regex',
        inside: Prism.languages.regex,
      },
      'regex-delimiter': /^\/|\/$/,
      'regex-flags': /^[a-z]+$/,
    },
  },
  // This must be declared before keyword because we use "function" inside the look-forward
  'function-variable': {
    pattern: /#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*[=:]\s*(?:async\s*)?(?:\bfunction\b|(?:\((?:[^()]|\([^()]*\))*\)|(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*)\s*=>))/,
    alias: 'function',
  },
  'parameter': [
    {
      pattern: /(function(?:\s+(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*)?\s*\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\))/,
      lookbehind: true,
      inside: Prism.languages.javascript,
    },
    {
      pattern: /(^|[^$\w\xA0-\uFFFF])(?!\s)[_$a-z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*=>)/i,
      lookbehind: true,
      inside: Prism.languages.javascript,
    },
    {
      pattern: /(\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\)\s*=>)/,
      lookbehind: true,
      inside: Prism.languages.javascript,
    },
    {
      pattern: /((?:\b|\s|^)(?!(?:as|async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally|for|from|function|get|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|set|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)(?![$\w\xA0-\uFFFF]))(?:(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*\s*)\(\s*|\]\s*\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\)\s*\{)/,
      lookbehind: true,
      inside: Prism.languages.javascript,
    },
  ],
  'constant': /\b[A-Z](?:[A-Z_]|\dx?)*\b/,
});

Prism.languages.insertBefore('javascript', 'string', {
  'hashbang': {
    pattern: /^#!.*/,
    greedy: true,
    alias: 'comment',
  },
  'template-string': {
    pattern: /`(?:\\[\s\S]|\$\{(?:[^{}]|\{(?:[^{}]|\{[^}]*\})*\})+\}|(?!\$\{)[^\\`])*`/,
    greedy: true,
    inside: {
      'template-punctuation': {
        pattern: /^`|`$/,
        alias: 'string',
      },
      'interpolation': {
        pattern: /((?:^|[^\\])(?:\\{2})*)\$\{(?:[^{}]|\{(?:[^{}]|\{[^}]*\})*\})+\}/,
        lookbehind: true,
        inside: {
          'interpolation-punctuation': {
            pattern: /^\$\{|\}$/,
            alias: 'punctuation',
          },
          rest: Prism.languages.javascript,
        },
      },
      'string': /[\s\S]+/,
    },
  },
  'string-property': {
    pattern: /((?:^|[,{])[ \t]*)(["'])(?:\\(?:\r\n|[\s\S])|(?!\2)[^\\\r\n])*\2(?=\s*:)/m,
    lookbehind: true,
    greedy: true,
    alias: 'property',
  },
});

Prism.languages.insertBefore('javascript', 'operator', {
  'literal-property': {
    pattern: /((?:^|[,{])[ \t]*)(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*:)/m,
    lookbehind: true,
    alias: 'property',
  },
});

if (Prism.languages.markup) {
  Prism.languages.markup.tag.addInlined('script', 'javascript');

  // add attribute support for all DOM events.
  // https://developer.mozilla.org/en-US/docs/Web/Events#Standard_events
  Prism.languages.markup.tag.addAttribute(
    /on(?:abort|blur|change|click|composition(?:end|start|update)|dblclick|error|focus(?:in|out)?|key(?:down|up)|load|mouse(?:down|enter|leave|move|out|over|up)|reset|resize|scroll|select|slotchange|submit|unload|wheel)/.source,
    'javascript',
  );
}

Prism.languages.js = Prism.languages.javascript;

(function (Prism) {
  // $ set | grep '^[A-Z][^[:space:]]*=' | cut -d= -f1 | tr '\n' '|'
  // + LC_ALL, RANDOM, REPLY, SECONDS.
  // + make sure PS1..4 are here as they are not always set,
  // - some useless things.
  var envVars = '\\b(?:BASH|BASHOPTS|BASH_ALIASES|BASH_ARGC|BASH_ARGV|BASH_CMDS|BASH_COMPLETION_COMPAT_DIR|BASH_LINENO|BASH_REMATCH|BASH_SOURCE|BASH_VERSINFO|BASH_VERSION|COLORTERM|COLUMNS|COMP_WORDBREAKS|DBUS_SESSION_BUS_ADDRESS|DEFAULTS_PATH|DESKTOP_SESSION|DIRSTACK|DISPLAY|EUID|GDMSESSION|GDM_LANG|GNOME_KEYRING_CONTROL|GNOME_KEYRING_PID|GPG_AGENT_INFO|GROUPS|HISTCONTROL|HISTFILE|HISTFILESIZE|HISTSIZE|HOME|HOSTNAME|HOSTTYPE|IFS|INSTANCE|JOB|LANG|LANGUAGE|LC_ADDRESS|LC_ALL|LC_IDENTIFICATION|LC_MEASUREMENT|LC_MONETARY|LC_NAME|LC_NUMERIC|LC_PAPER|LC_TELEPHONE|LC_TIME|LESSCLOSE|LESSOPEN|LINES|LOGNAME|LS_COLORS|MACHTYPE|MAILCHECK|MANDATORY_PATH|NO_AT_BRIDGE|OLDPWD|OPTERR|OPTIND|ORBIT_SOCKETDIR|OSTYPE|PAPERSIZE|PATH|PIPESTATUS|PPID|PS1|PS2|PS3|PS4|PWD|RANDOM|REPLY|SECONDS|SELINUX_INIT|SESSION|SESSIONTYPE|SESSION_MANAGER|SHELL|SHELLOPTS|SHLVL|SSH_AUTH_SOCK|TERM|UID|UPSTART_EVENTS|UPSTART_INSTANCE|UPSTART_JOB|UPSTART_SESSION|USER|WINDOWID|XAUTHORITY|XDG_CONFIG_DIRS|XDG_CURRENT_DESKTOP|XDG_DATA_DIRS|XDG_GREETER_DATA_DIR|XDG_MENU_PREFIX|XDG_RUNTIME_DIR|XDG_SEAT|XDG_SEAT_PATH|XDG_SESSION_DESKTOP|XDG_SESSION_ID|XDG_SESSION_PATH|XDG_SESSION_TYPE|XDG_VTNR|XMODIFIERS)\\b';

  var commandAfterHeredoc = {
    pattern: /(^(["']?)\w+\2)[ \t]+\S.*/,
    lookbehind: true,
    alias: 'punctuation', // this looks reasonably well in all themes
    inside: null, // see below
  };

  var insideString = {
    'bash': commandAfterHeredoc,
    'environment': {
      pattern: RegExp('\\$' + envVars),
      alias: 'constant',
    },
    'variable': [
      // [0]: Arithmetic Environment
      {
        pattern: /\$?\(\([\s\S]+?\)\)/,
        greedy: true,
        inside: {
          // If there is a $ sign at the beginning highlight $(( and )) as variable
          'variable': [
            {
              pattern: /(^\$\(\([\s\S]+)\)\)/,
              lookbehind: true,
            },
            /^\$\(\(/,
          ],
          'number': /\b0x[\dA-Fa-f]+\b|(?:\b\d+(?:\.\d*)?|\B\.\d+)(?:[Ee]-?\d+)?/,
          // Operators according to https://www.gnu.org/software/bash/manual/bashref.html#Shell-Arithmetic
          'operator': /--|\+\+|\*\*=?|<<=?|>>=?|&&|\|\||[=!+\-*/%<>^&|]=?|[?~:]/,
          // If there is no $ sign at the beginning highlight (( and )) as punctuation
          'punctuation': /\(\(?|\)\)?|,|;/,
        },
      },
      // [1]: Command Substitution
      {
        pattern: /\$\((?:\([^)]+\)|[^()])+\)|`[^`]+`/,
        greedy: true,
        inside: {
          'variable': /^\$\(|^`|\)$|`$/,
        },
      },
      // [2]: Brace expansion
      {
        pattern: /\$\{[^}]+\}/,
        greedy: true,
        inside: {
          'operator': /:[-=?+]?|[!\/]|##?|%%?|\^\^?|,,?/,
          'punctuation': /[\[\]]/,
          'environment': {
            pattern: RegExp('(\\{)' + envVars),
            lookbehind: true,
            alias: 'constant',
          },
        },
      },
      /\$(?:\w+|[#?*!@$])/,
    ],
    // Escape sequences from echo and printf's manuals, and escaped quotes.
    'entity': /\\(?:[abceEfnrtv\\"]|O?[0-7]{1,3}|U[0-9a-fA-F]{8}|u[0-9a-fA-F]{4}|x[0-9a-fA-F]{1,2})/,
  };

  Prism.languages.bash = {
    'shebang': {
      pattern: /^#!\s*\/.*/,
      alias: 'important',
    },
    'comment': {
      pattern: /(^|[^"{\\$])#.*/,
      lookbehind: true,
    },
    'function-name': [
      // a) function foo {
      // b) foo() {
      // c) function foo() {
      // but not “foo {”
      {
        // a) and c)
        pattern: /(\bfunction\s+)[\w-]+(?=(?:\s*\(?:\s*\))?\s*\{)/,
        lookbehind: true,
        alias: 'function',
      },
      {
        // b)
        pattern: /\b[\w-]+(?=\s*\(\s*\)\s*\{)/,
        alias: 'function',
      },
    ],
    // Highlight variable names as variables in for and select beginnings.
    'for-or-select': {
      pattern: /(\b(?:for|select)\s+)\w+(?=\s+in\s)/,
      alias: 'variable',
      lookbehind: true,
    },
    // Highlight variable names as variables in the left-hand part
    // of assignments (“=” and “+=”).
    'assign-left': {
      pattern: /(^|[\s;|&]|[<>]\()\w+(?:\.\w+)*(?=\+?=)/,
      inside: {
        'environment': {
          pattern: RegExp('(^|[\\s;|&]|[<>]\\()' + envVars),
          lookbehind: true,
          alias: 'constant',
        },
      },
      alias: 'variable',
      lookbehind: true,
    },
    // Highlight parameter names as variables
    'parameter': {
      pattern: /(^|\s)-{1,2}(?:\w+:[+-]?)?\w+(?:\.\w+)*(?=[=\s]|$)/,
      alias: 'variable',
      lookbehind: true,
    },
    'string': [
      // Support for Here-documents https://en.wikipedia.org/wiki/Here_document
      {
        pattern: /((?:^|[^<])<<-?\s*)(\w+)\s[\s\S]*?(?:\r?\n|\r)\2/,
        lookbehind: true,
        greedy: true,
        inside: insideString,
      },
      // Here-document with quotes around the tag
      // → No expansion (so no “inside”).
      {
        pattern: /((?:^|[^<])<<-?\s*)(["'])(\w+)\2\s[\s\S]*?(?:\r?\n|\r)\3/,
        lookbehind: true,
        greedy: true,
        inside: {
          'bash': commandAfterHeredoc,
        },
      },
      // “Normal” string
      {
        // https://www.gnu.org/software/bash/manual/html_node/Double-Quotes.html
        pattern: /(^|[^\\](?:\\\\)*)"(?:\\[\s\S]|\$\([^)]+\)|\$(?!\()|`[^`]+`|[^"\\`$])*"/,
        lookbehind: true,
        greedy: true,
        inside: insideString,
      },
      {
        // https://www.gnu.org/software/bash/manual/html_node/Single-Quotes.html
        pattern: /(^|[^$\\])'[^']*'/,
        lookbehind: true,
        greedy: true,
      },
      {
        // https://www.gnu.org/software/bash/manual/html_node/ANSI_002dC-Quoting.html
        pattern: /\$'(?:[^'\\]|\\[\s\S])*'/,
        greedy: true,
        inside: {
          'entity': insideString.entity,
        },
      },
    ],
    'environment': {
      pattern: RegExp('\\$?' + envVars),
      alias: 'constant',
    },
    'variable': insideString.variable,
    'function': {
      pattern: /(^|[\s;|&]|[<>]\()(?:add|apropos|apt|apt-cache|apt-get|aptitude|aspell|automysqlbackup|awk|basename|bash|bc|bconsole|bg|bzip2|cal|cargo|cat|cfdisk|chgrp|chkconfig|chmod|chown|chroot|cksum|clear|cmp|column|comm|composer|cp|cron|crontab|csplit|curl|cut|date|dc|dd|ddrescue|debootstrap|df|diff|diff3|dig|dir|dircolors|dirname|dirs|dmesg|docker|docker-compose|du|egrep|eject|env|ethtool|expand|expect|expr|fdformat|fdisk|fg|fgrep|file|find|fmt|fold|format|free|fsck|ftp|fuser|gawk|git|gparted|grep|groupadd|groupdel|groupmod|groups|grub-mkconfig|gzip|halt|head|hg|history|host|hostname|htop|iconv|id|ifconfig|ifdown|ifup|import|install|ip|java|jobs|join|kill|killall|less|link|ln|locate|logname|logrotate|look|lpc|lpr|lprint|lprintd|lprintq|lprm|ls|lsof|lynx|make|man|mc|mdadm|mkconfig|mkdir|mke2fs|mkfifo|mkfs|mkisofs|mknod|mkswap|mmv|more|most|mount|mtools|mtr|mutt|mv|nano|nc|netstat|nice|nl|node|nohup|notify-send|npm|nslookup|op|open|parted|passwd|paste|pathchk|ping|pkill|pnpm|podman|podman-compose|popd|pr|printcap|printenv|ps|pushd|pv|quota|quotacheck|quotactl|ram|rar|rcp|reboot|remsync|rename|renice|rev|rm|rmdir|rpm|rsync|scp|screen|sdiff|sed|sendmail|seq|service|sftp|sh|shellcheck|shuf|shutdown|sleep|slocate|sort|split|ssh|stat|strace|su|sudo|sum|suspend|swapon|sync|sysctl|tac|tail|tar|tee|time|timeout|top|touch|tr|traceroute|tsort|tty|umount|uname|unexpand|uniq|units|unrar|unshar|unzip|update-grub|uptime|useradd|userdel|usermod|users|uudecode|uuencode|v|vcpkg|vdir|vi|vim|virsh|vmstat|wait|watch|wc|wget|whereis|which|who|whoami|write|xargs|xdg-open|yarn|yes|zenity|zip|zsh|zypper)(?=$|[)\s;|&])/,
      lookbehind: true,
    },
    'keyword': {
      pattern: /(^|[\s;|&]|[<>]\()(?:case|do|done|elif|else|esac|fi|for|function|if|in|select|then|until|while)(?=$|[)\s;|&])/,
      lookbehind: true,
    },
    // https://www.gnu.org/software/bash/manual/html_node/Shell-Builtin-Commands.html
    'builtin': {
      pattern: /(^|[\s;|&]|[<>]\()(?:\.|:|alias|bind|break|builtin|caller|cd|command|continue|declare|echo|enable|eval|exec|exit|export|getopts|hash|help|let|local|logout|mapfile|printf|pwd|read|readarray|readonly|return|set|shift|shopt|source|test|times|trap|type|typeset|ulimit|umask|unalias|unset)(?=$|[)\s;|&])/,
      lookbehind: true,
      // Alias added to make those easier to distinguish from strings.
      alias: 'class-name',
    },
    'boolean': {
      pattern: /(^|[\s;|&]|[<>]\()(?:false|true)(?=$|[)\s;|&])/,
      lookbehind: true,
    },
    'file-descriptor': {
      pattern: /\B&\d\b/,
      alias: 'important',
    },
    'operator': {
      // Lots of redirections here, but not just that.
      pattern: /\d?<>|>\||\+=|=[=~]?|!=?|<<[<-]?|[&\d]?>>|\d[<>]&?|[<>][&=]?|&[>&]?|\|[&|]?/,
      inside: {
        'file-descriptor': {
          pattern: /^\d/,
          alias: 'important',
        },
      },
    },
    'punctuation': /\$?\(\(?|\)\)?|\.\.|[{}[\];\\]/,
    'number': {
      pattern: /(^|\s)(?:[1-9]\d*|0)(?:[.,]\d+)?\b/,
      lookbehind: true,
    },
  };

  commandAfterHeredoc.inside = Prism.languages.bash;

  /* Patterns in command substitution. */
  var toBeCopied = [
    'comment',
    'function-name',
    'for-or-select',
    'assign-left',
    'parameter',
    'string',
    'environment',
    'function',
    'keyword',
    'builtin',
    'boolean',
    'file-descriptor',
    'operator',
    'punctuation',
    'number',
  ];
  var inside = insideString.variable[1].inside;
  for (var i = 0; i < toBeCopied.length; i++) {
    inside[toBeCopied[i]] = Prism.languages.bash[toBeCopied[i]];
  }

  Prism.languages.sh = Prism.languages.bash;
  Prism.languages.shell = Prism.languages.bash;
}(Prism));

(function (Prism) {

  Prism.languages.diff = {
    'coord': [
      // Match all kinds of coord lines (prefixed by "+++", "---" or "***").
      /^(?:\*{3}|-{3}|\+{3}).*$/m,
      // Match "@@ ... @@" coord lines in unified diff.
      /^@@.*@@$/m,
      // Match coord lines in normal diff (starts with a number).
      /^\d.*$/m,
    ],

    // deleted, inserted, unchanged, diff
  };

  /**
   * A map from the name of a block to its line prefix.
   *
   * @type {Object<string, string>}
   */
  var PREFIXES = {
    'deleted-sign': '-',
    'deleted-arrow': '<',
    'inserted-sign': '+',
    'inserted-arrow': '>',
    'unchanged': ' ',
    'diff': '!',
  };

  // add a token for each prefix
  Object.keys(PREFIXES).forEach(function (name) {
    var prefix = PREFIXES[name];

    var alias = [];
    if (!/^\w+$/.test(name)) { // "deleted-sign" -> "deleted"
      alias.push(/\w+/.exec(name)[0]);
    }
    if (name === 'diff') {
      alias.push('bold');
    }

    Prism.languages.diff[name] = {
      pattern: RegExp('^(?:[' + prefix + '].*(?:\r\n?|\n|(?![\\s\\S])))+', 'm'),
      alias: alias,
      inside: {
        'line': {
          pattern: /(.)(?=[\s\S]).*(?:\r\n?|\n)?/,
          lookbehind: true,
        },
        'prefix': {
          pattern: /[\s\S]/,
          alias: /\w+/.exec(name)[0],
        },
      },
    };

  });

  // make prefixes available to Diff plugin
  Object.defineProperty(Prism.languages.diff, 'PREFIXES', {
    value: PREFIXES,
  });

}(Prism));

// https://www.json.org/json-en.html
Prism.languages.json = {
  'property': {
    pattern: /(^|[^\\])"(?:\\.|[^\\"\r\n])*"(?=\s*:)/,
    lookbehind: true,
    greedy: true,
  },
  'string': {
    pattern: /(^|[^\\])"(?:\\.|[^\\"\r\n])*"(?!\s*:)/,
    lookbehind: true,
    greedy: true,
  },
  'comment': {
    pattern: /\/\/.*|\/\*[\s\S]*?(?:\*\/|$)/,
    greedy: true,
  },
  'number': /-?\b\d+(?:\.\d+)?(?:e[+-]?\d+)?\b/i,
  'punctuation': /[{}[\],]/,
  'operator': /:/,
  'boolean': /\b(?:false|true)\b/,
  'null': {
    pattern: /\bnull\b/,
    alias: 'keyword',
  },
};

Prism.languages.webmanifest = Prism.languages.json;

(function (Prism) {

  // Allow only one line break
  var inner = /(?:\\.|[^\\\n\r]|(?:\n|\r\n?)(?![\r\n]))/.source;

  /**
   * This function is intended for the creation of the bold or italic pattern.
   *
   * This also adds a lookbehind group to the given pattern to ensure that the pattern is not backslash-escaped.
   *
   * _Note:_ Keep in mind that this adds a capturing group.
   *
   * @param {string} pattern
   * @returns {RegExp}
   */
  function createInline (pattern) {
    pattern = pattern.replace(/<inner>/g, function () { return inner; });
    return RegExp(/((?:^|[^\\])(?:\\{2})*)/.source + '(?:' + pattern + ')');
  }

  var tableCell = /(?:\\.|``(?:[^`\r\n]|`(?!`))+``|`[^`\r\n]+`|[^\\|\r\n`])+/.source;
  var tableRow = /\|?__(?:\|__)+\|?(?:(?:\n|\r\n?)|(?![\s\S]))/.source.replace(/__/g,
    function () { return tableCell; });
  var tableLine = /\|?[ \t]*:?-{3,}:?[ \t]*(?:\|[ \t]*:?-{3,}:?[ \t]*)+\|?(?:\n|\r\n?)/.source;

  Prism.languages.markdown = Prism.languages.extend('markup', {});
  Prism.languages.insertBefore('markdown', 'prolog', {
    'front-matter-block': {
      pattern: /(^(?:\s*[\r\n])?)---(?!.)[\s\S]*?[\r\n]---(?!.)/,
      lookbehind: true,
      greedy: true,
      inside: {
        'punctuation': /^---|---$/,
        'front-matter': {
          pattern: /\S+(?:\s+\S+)*/,
          alias: ['yaml', 'language-yaml'],
          inside: Prism.languages.yaml,
        },
      },
    },
    'blockquote': {
      // > ...
      pattern: /^>(?:[\t ]*>)*/m,
      alias: 'punctuation',
    },
    'table': {
      pattern: RegExp('^' + tableRow + tableLine + '(?:' + tableRow + ')*', 'm'),
      inside: {
        'table-data-rows': {
          pattern: RegExp('^(' + tableRow + tableLine + ')(?:' + tableRow + ')*$'),
          lookbehind: true,
          inside: {
            'table-data': {
              pattern: RegExp(tableCell),
              inside: Prism.languages.markdown,
            },
            'punctuation': /\|/,
          },
        },
        'table-line': {
          pattern: RegExp('^(' + tableRow + ')' + tableLine + '$'),
          lookbehind: true,
          inside: {
            'punctuation': /\||:?-{3,}:?/,
          },
        },
        'table-header-row': {
          pattern: RegExp('^' + tableRow + '$'),
          inside: {
            'table-header': {
              pattern: RegExp(tableCell),
              alias: 'important',
              inside: Prism.languages.markdown,
            },
            'punctuation': /\|/,
          },
        },
      },
    },
    'code': [
      {
        // Prefixed by 4 spaces or 1 tab and preceded by an empty line
        pattern: /((?:^|\n)[ \t]*\n|(?:^|\r\n?)[ \t]*\r\n?)(?: {4}|\t).+(?:(?:\n|\r\n?)(?: {4}|\t).+)*/,
        lookbehind: true,
        alias: 'keyword',
      },
      {
        // ```optional language
        // code block
        // ```
        pattern: /^```[\s\S]*?^```$/m,
        greedy: true,
        inside: {
          'code-block': {
            pattern: /^(```.*(?:\n|\r\n?))[\s\S]+?(?=(?:\n|\r\n?)^```$)/m,
            lookbehind: true,
          },
          'code-language': {
            pattern: /^(```).+/,
            lookbehind: true,
          },
          'punctuation': /```/,
        },
      },
    ],
    'title': [
      {
        // title 1
        // =======

        // title 2
        // -------
        pattern: /\S.*(?:\n|\r\n?)(?:==+|--+)(?=[ \t]*$)/m,
        alias: 'important',
        inside: {
          punctuation: /==+$|--+$/,
        },
      },
      {
        // # title 1
        // ###### title 6
        pattern: /(^\s*)#.+/m,
        lookbehind: true,
        alias: 'important',
        inside: {
          punctuation: /^#+|#+$/,
        },
      },
    ],
    'hr': {
      // ***
      // ---
      // * * *
      // -----------
      pattern: /(^\s*)([*-])(?:[\t ]*\2){2,}(?=\s*$)/m,
      lookbehind: true,
      alias: 'punctuation',
    },
    'list': {
      // * item
      // + item
      // - item
      // 1. item
      pattern: /(^\s*)(?:[*+-]|\d+\.)(?=[\t ].)/m,
      lookbehind: true,
      alias: 'punctuation',
    },
    'url-reference': {
      // [id]: http://example.com "Optional title"
      // [id]: http://example.com 'Optional title'
      // [id]: http://example.com (Optional title)
      // [id]: <http://example.com> "Optional title"
      pattern: /!?\[[^\]]+\]:[\t ]+(?:\S+|<(?:\\.|[^>\\])+>)(?:[\t ]+(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\((?:\\.|[^)\\])*\)))?/,
      inside: {
        'variable': {
          pattern: /^(!?\[)[^\]]+/,
          lookbehind: true,
        },
        'string': /(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\((?:\\.|[^)\\])*\))$/,
        'punctuation': /^[\[\]!:]|[<>]/,
      },
      alias: 'url',
    },
    'bold': {
      // **strong**
      // __strong__

      // allow one nested instance of italic text using the same delimiter
      pattern: createInline(
        /\b__(?:(?!_)<inner>|_(?:(?!_)<inner>)+_)+__\b|\*\*(?:(?!\*)<inner>|\*(?:(?!\*)<inner>)+\*)+\*\*/.source),
      lookbehind: true,
      greedy: true,
      inside: {
        'content': {
          pattern: /(^..)[\s\S]+(?=..$)/,
          lookbehind: true,
          inside: {}, // see below
        },
        'punctuation': /\*\*|__/,
      },
    },
    'italic': {
      // *em*
      // _em_

      // allow one nested instance of bold text using the same delimiter
      pattern: createInline(
        /\b_(?:(?!_)<inner>|__(?:(?!_)<inner>)+__)+_\b|\*(?:(?!\*)<inner>|\*\*(?:(?!\*)<inner>)+\*\*)+\*/.source),
      lookbehind: true,
      greedy: true,
      inside: {
        'content': {
          pattern: /(^.)[\s\S]+(?=.$)/,
          lookbehind: true,
          inside: {}, // see below
        },
        'punctuation': /[*_]/,
      },
    },
    'strike': {
      // ~~strike through~~
      // ~strike~
      // eslint-disable-next-line regexp/strict
      pattern: createInline(/(~~?)(?:(?!~)<inner>)+\2/.source),
      lookbehind: true,
      greedy: true,
      inside: {
        'content': {
          pattern: /(^~~?)[\s\S]+(?=\1$)/,
          lookbehind: true,
          inside: {}, // see below
        },
        'punctuation': /~~?/,
      },
    },
    'code-snippet': {
      // `code`
      // ``code``
      pattern: /(^|[^\\`])(?:``[^`\r\n]+(?:`[^`\r\n]+)*``(?!`)|`[^`\r\n]+`(?!`))/,
      lookbehind: true,
      greedy: true,
      alias: ['code', 'keyword'],
    },
    'url': {
      // [example](http://example.com "Optional title")
      // [example][id]
      // [example] [id]
      pattern: createInline(
        /!?\[(?:(?!\])<inner>)+\](?:\([^\s)]+(?:[\t ]+"(?:\\.|[^"\\])*")?\)|[ \t]?\[(?:(?!\])<inner>)+\])/.source),
      lookbehind: true,
      greedy: true,
      inside: {
        'operator': /^!/,
        'content': {
          pattern: /(^\[)[^\]]+(?=\])/,
          lookbehind: true,
          inside: {}, // see below
        },
        'variable': {
          pattern: /(^\][ \t]?\[)[^\]]+(?=\]$)/,
          lookbehind: true,
        },
        'url': {
          pattern: /(^\]\()[^\s)]+/,
          lookbehind: true,
        },
        'string': {
          pattern: /(^[ \t]+)"(?:\\.|[^"\\])*"(?=\)$)/,
          lookbehind: true,
        },
      },
    },
  });

  ['url', 'bold', 'italic', 'strike'].forEach(function (token) {
    ['url', 'bold', 'italic', 'strike', 'code-snippet'].forEach(function (inside) {
      if (token !== inside) {
        Prism.languages.markdown[token].inside.content.inside[inside] = Prism.languages.markdown[inside];
      }
    });
  });

  Prism.hooks.add('after-tokenize', function (env) {
    if (env.language !== 'markdown' && env.language !== 'md') {
      return;
    }

    function walkTokens (tokens) {
      if (!tokens || typeof tokens === 'string') {
        return;
      }

      for (var i = 0, l = tokens.length; i < l; i++) {
        var token = tokens[i];

        if (token.type !== 'code') {
          walkTokens(token.content);
          continue;
        }

        /*
				 * Add the correct `language-xxxx` class to this code block. Keep in mind that the `code-language` token
				 * is optional. But the grammar is defined so that there is only one case we have to handle:
				 *
				 * token.content = [
				 *     <span class="punctuation">```</span>,
				 *     <span class="code-language">xxxx</span>,
				 *     '\n', // exactly one new lines (\r or \n or \r\n)
				 *     <span class="code-block">...</span>,
				 *     '\n', // exactly one new lines again
				 *     <span class="punctuation">```</span>
				 * ];
				 */

        var codeLang = token.content[1];
        var codeBlock = token.content[3];

        if (codeLang && codeBlock &&
          codeLang.type === 'code-language' && codeBlock.type === 'code-block' &&
          typeof codeLang.content === 'string') {

          // this might be a language that Prism does not support

          // do some replacements to support C++, C#, and F#
          var lang = codeLang.content.replace(/\b#/g, 'sharp').replace(/\b\+\+/g, 'pp');
          // only use the first word
          lang = (/[a-z][\w-]*/i.exec(lang) || [''])[0].toLowerCase();
          var alias = 'language-' + lang;

          // add alias
          if (!codeBlock.alias) {
            codeBlock.alias = [alias];
          } else if (typeof codeBlock.alias === 'string') {
            codeBlock.alias = [codeBlock.alias, alias];
          } else {
            codeBlock.alias.push(alias);
          }
        }
      }
    }

    walkTokens(env.tokens);
  });

  Prism.hooks.add('wrap', function (env) {
    if (env.type !== 'code-block') {
      return;
    }

    var codeLang = '';
    for (var i = 0, l = env.classes.length; i < l; i++) {
      var cls = env.classes[i];
      var match = /language-(.+)/.exec(cls);
      if (match) {
        codeLang = match[1];
        break;
      }
    }

    var grammar = Prism.languages[codeLang];

    if (!grammar) {
      if (codeLang && codeLang !== 'none' && Prism.plugins.autoloader) {
        var id = 'md-' + new Date().valueOf() + '-' + Math.floor(Math.random() * 1e16);
        env.attributes['id'] = id;

        Prism.plugins.autoloader.loadLanguages(codeLang, function () {
          var ele = document.getElementById(id);
          if (ele) {
            ele.innerHTML = Prism.highlight(ele.textContent, Prism.languages[codeLang], codeLang);
          }
        });
      }
    } else {
      env.content = Prism.highlight(textContent(env.content), grammar, codeLang);
    }
  });

  var tagPattern = RegExp(Prism.languages.markup.tag.pattern.source, 'gi');

  /**
   * A list of known entity names.
   *
   * This will always be incomplete to save space. The current list is the one used by lowdash's unescape function.
   *
   * @see {@link https://github.com/lodash/lodash/blob/2da024c3b4f9947a48517639de7560457cd4ec6c/unescape.js#L2}
   */
  var KNOWN_ENTITY_NAMES = {
    'amp': '&',
    'lt': '<',
    'gt': '>',
    'quot': '"',
  };

  // IE 11 doesn't support `String.fromCodePoint`
  var fromCodePoint = String.fromCodePoint || String.fromCharCode;

  /**
   * Returns the text content of a given HTML source code string.
   *
   * @param {string} html
   * @returns {string}
   */
  function textContent (html) {
    // remove all tags
    var text = html.replace(tagPattern, '');

    // decode known entities
    text = text.replace(/&(\w{1,8}|#x?[\da-f]{1,8});/gi, function (m, code) {
      code = code.toLowerCase();

      if (code[0] === '#') {
        var value;
        if (code[1] === 'x') {
          value = parseInt(code.slice(2), 16);
        } else {
          value = Number(code.slice(1));
        }

        return fromCodePoint(value);
      } else {
        var known = KNOWN_ENTITY_NAMES[code];
        if (known) {
          return known;
        }

        // unable to decode
        return m;
      }
    });

    return text;
  }

  Prism.languages.md = Prism.languages.markdown;

}(Prism));

(function (Prism) {

  var javascript = Prism.util.clone(Prism.languages.javascript);

  var space = /(?:\s|\/\/.*(?!.)|\/\*(?:[^*]|\*(?!\/))\*\/)/.source;
  var braces = /(?:\{(?:\{(?:\{[^{}]*\}|[^{}])*\}|[^{}])*\})/.source;
  var spread = /(?:\{<S>*\.{3}(?:[^{}]|<BRACES>)*\})/.source;

  /**
   * @param {string} source
   * @param {string} [flags]
   */
  function re (source, flags) {
    source = source.replace(/<S>/g, function () { return space; }).
      replace(/<BRACES>/g, function () { return braces; }).
      replace(/<SPREAD>/g, function () { return spread; });
    return RegExp(source, flags);
  }

  spread = re(spread).source;

  Prism.languages.jsx = Prism.languages.extend('markup', javascript);
  Prism.languages.jsx.tag.pattern = re(
    /<\/?(?:[\w.:-]+(?:<S>+(?:[\w.:$-]+(?:=(?:"(?:\\[\s\S]|[^\\"])*"|'(?:\\[\s\S]|[^\\'])*'|[^\s{'"/>=]+|<BRACES>))?|<SPREAD>))*<S>*\/?)?>/.source,
  );

  Prism.languages.jsx.tag.inside['tag'].pattern = /^<\/?[^\s>\/]*/;
  Prism.languages.jsx.tag.inside['attr-value'].pattern = /=(?!\{)(?:"(?:\\[\s\S]|[^\\"])*"|'(?:\\[\s\S]|[^\\'])*'|[^\s'">]+)/;
  Prism.languages.jsx.tag.inside['tag'].inside['class-name'] = /^[A-Z]\w*(?:\.[A-Z]\w*)*$/;
  Prism.languages.jsx.tag.inside['comment'] = javascript['comment'];

  Prism.languages.insertBefore('inside', 'attr-name', {
    'spread': {
      pattern: re(/<SPREAD>/.source),
      inside: Prism.languages.jsx,
    },
  }, Prism.languages.jsx.tag);

  Prism.languages.insertBefore('inside', 'special-attr', {
    'script': {
      // Allow for two levels of nesting
      pattern: re(/=<BRACES>/.source),
      alias: 'language-javascript',
      inside: {
        'script-punctuation': {
          pattern: /^=(?=\{)/,
          alias: 'punctuation',
        },
        rest: Prism.languages.jsx,
      },
    },
  }, Prism.languages.jsx.tag);

  // The following will handle plain text inside tags
  var stringifyToken = function (token) {
    if (!token) {
      return '';
    }
    if (typeof token === 'string') {
      return token;
    }
    if (typeof token.content === 'string') {
      return token.content;
    }
    return token.content.map(stringifyToken).join('');
  };

  var walkTokens = function (tokens) {
    var openedTags = [];
    for (var i = 0; i < tokens.length; i++) {
      var token = tokens[i];
      var notTagNorBrace = false;

      if (typeof token !== 'string') {
        if (token.type === 'tag' && token.content[0] && token.content[0].type === 'tag') {
          // We found a tag, now find its kind

          if (token.content[0].content[0].content === '</') {
            // Closing tag
            if (openedTags.length > 0 && openedTags[openedTags.length - 1].tagName ===
              stringifyToken(token.content[0].content[1])) {
              // Pop matching opening tag
              openedTags.pop();
            }
          } else {
            if (token.content[token.content.length - 1].content === '/>') {
              // Autoclosed tag, ignore
            } else {
              // Opening tag
              openedTags.push({
                tagName: stringifyToken(token.content[0].content[1]),
                openedBraces: 0,
              });
            }
          }
        } else if (openedTags.length > 0 && token.type === 'punctuation' && token.content === '{') {

          // Here we might have entered a JSX context inside a tag
          openedTags[openedTags.length - 1].openedBraces++;

        } else if (openedTags.length > 0 && openedTags[openedTags.length - 1].openedBraces > 0 && token.type ===
          'punctuation' && token.content === '}') {

          // Here we might have left a JSX context inside a tag
          openedTags[openedTags.length - 1].openedBraces--;

        } else {
          notTagNorBrace = true;
        }
      }
      if (notTagNorBrace || typeof token === 'string') {
        if (openedTags.length > 0 && openedTags[openedTags.length - 1].openedBraces === 0) {
          // Here we are inside a tag, and not inside a JSX context.
          // That's plain text: drop any tokens matched.
          var plainText = stringifyToken(token);

          // And merge text with adjacent text
          if (i < tokens.length - 1 && (typeof tokens[i + 1] === 'string' || tokens[i + 1].type === 'plain-text')) {
            plainText += stringifyToken(tokens[i + 1]);
            tokens.splice(i + 1, 1);
          }
          if (i > 0 && (typeof tokens[i - 1] === 'string' || tokens[i - 1].type === 'plain-text')) {
            plainText = stringifyToken(tokens[i - 1]) + plainText;
            tokens.splice(i - 1, 1);
            i--;
          }

          tokens[i] = new Prism.Token('plain-text', plainText, null, plainText);
        }
      }

      if (token.content && typeof token.content !== 'string') {
        walkTokens(token.content);
      }
    }
  };

  Prism.hooks.add('after-tokenize', function (env) {
    if (env.language !== 'jsx' && env.language !== 'tsx') {
      return;
    }
    walkTokens(env.tokens);
  });

}(Prism));

(function (Prism) {

  Prism.languages.typescript = Prism.languages.extend('javascript', {
    'class-name': {
      pattern: /(\b(?:class|extends|implements|instanceof|interface|new|type)\s+)(?!keyof\b)(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?:\s*<(?:[^<>]|<(?:[^<>]|<[^<>]*>)*>)*>)?/,
      lookbehind: true,
      greedy: true,
      inside: null, // see below
    },
    'builtin': /\b(?:Array|Function|Promise|any|boolean|console|never|number|string|symbol|unknown)\b/,
  });

  // The keywords TypeScript adds to JavaScript
  Prism.languages.typescript.keyword.push(
    /\b(?:abstract|declare|is|keyof|readonly|require)\b/,
    // keywords that have to be followed by an identifier
    /\b(?:asserts|infer|interface|module|namespace|type)\b(?=\s*(?:[{_$a-zA-Z\xA0-\uFFFF]|$))/,
    // This is for `import type *, {}`
    /\btype\b(?=\s*(?:[\{*]|$))/,
  );

  // doesn't work with TS because TS is too complex
  delete Prism.languages.typescript['parameter'];
  delete Prism.languages.typescript['literal-property'];

  // a version of typescript specifically for highlighting types
  var typeInside = Prism.languages.extend('typescript', {});
  delete typeInside['class-name'];

  Prism.languages.typescript['class-name'].inside = typeInside;

  Prism.languages.insertBefore('typescript', 'function', {
    'decorator': {
      pattern: /@[$\w\xA0-\uFFFF]+/,
      inside: {
        'at': {
          pattern: /^@/,
          alias: 'operator',
        },
        'function': /^[\s\S]+/,
      },
    },
    'generic-function': {
      // e.g. foo<T extends "bar" | "baz">( ...
      pattern: /#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*\s*<(?:[^<>]|<(?:[^<>]|<[^<>]*>)*>)*>(?=\s*\()/,
      greedy: true,
      inside: {
        'function': /^#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*/,
        'generic': {
          pattern: /<[\s\S]+/, // everything after the first <
          alias: 'class-name',
          inside: typeInside,
        },
      },
    },
  });

  Prism.languages.ts = Prism.languages.typescript;

}(Prism));

(function (Prism) {
  var typescript = Prism.util.clone(Prism.languages.typescript);
  Prism.languages.tsx = Prism.languages.extend('jsx', typescript);

  // doesn't work with TS because TS is too complex
  delete Prism.languages.tsx['parameter'];
  delete Prism.languages.tsx['literal-property'];

  // This will prevent collisions between TSX tags and TS generic types.
  // Idea by https://github.com/karlhorky
  // Discussion: https://github.com/PrismJS/prism/issues/2594#issuecomment-710666928
  var tag = Prism.languages.tsx.tag;
  tag.pattern = RegExp(/(^|[^\w$]|(?=<\/))/.source + '(?:' + tag.pattern.source + ')', tag.pattern.flags);
  tag.lookbehind = true;
}(Prism));

(function (Prism) {

  var specialEscape = {
    pattern: /\\[\\(){}[\]^$+*?|.]/,
    alias: 'escape',
  };
  var escape = /\\(?:x[\da-fA-F]{2}|u[\da-fA-F]{4}|u\{[\da-fA-F]+\}|0[0-7]{0,2}|[123][0-7]{2}|c[a-zA-Z]|.)/;
  var charSet = {
    pattern: /\.|\\[wsd]|\\p\{[^{}]+\}/i,
    alias: 'class-name',
  };
  var charSetWithoutDot = {
    pattern: /\\[wsd]|\\p\{[^{}]+\}/i,
    alias: 'class-name',
  };

  var rangeChar = '(?:[^\\\\-]|' + escape.source + ')';
  var range = RegExp(rangeChar + '-' + rangeChar);

  // the name of a capturing group
  var groupName = {
    pattern: /(<|')[^<>']+(?=[>']$)/,
    lookbehind: true,
    alias: 'variable',
  };

  Prism.languages.regex = {
    'char-class': {
      pattern: /((?:^|[^\\])(?:\\\\)*)\[(?:[^\\\]]|\\[\s\S])*\]/,
      lookbehind: true,
      inside: {
        'char-class-negation': {
          pattern: /(^\[)\^/,
          lookbehind: true,
          alias: 'operator',
        },
        'char-class-punctuation': {
          pattern: /^\[|\]$/,
          alias: 'punctuation',
        },
        'range': {
          pattern: range,
          inside: {
            'escape': escape,
            'range-punctuation': {
              pattern: /-/,
              alias: 'operator',
            },
          },
        },
        'special-escape': specialEscape,
        'char-set': charSetWithoutDot,
        'escape': escape,
      },
    },
    'special-escape': specialEscape,
    'char-set': charSet,
    'backreference': [
      {
        // a backreference which is not an octal escape
        pattern: /\\(?![123][0-7]{2})[1-9]/,
        alias: 'keyword',
      },
      {
        pattern: /\\k<[^<>']+>/,
        alias: 'keyword',
        inside: {
          'group-name': groupName,
        },
      },
    ],
    'anchor': {
      pattern: /[$^]|\\[ABbGZz]/,
      alias: 'function',
    },
    'escape': escape,
    'group': [
      {
        // https://docs.oracle.com/javase/10/docs/api/java/util/regex/Pattern.html
        // https://docs.microsoft.com/en-us/dotnet/standard/base-types/regular-expression-language-quick-reference?view=netframework-4.7.2#grouping-constructs

        // (), (?<name>), (?'name'), (?>), (?:), (?=), (?!), (?<=), (?<!), (?is-m), (?i-m:)
        pattern: /\((?:\?(?:<[^<>']+>|'[^<>']+'|[>:]|<?[=!]|[idmnsuxU]+(?:-[idmnsuxU]+)?:?))?/,
        alias: 'punctuation',
        inside: {
          'group-name': groupName,
        },
      },
      {
        pattern: /\)/,
        alias: 'punctuation',
      },
    ],
    'quantifier': {
      pattern: /(?:[+*?]|\{\d+(?:,\d*)?\})[?+]?/,
      alias: 'number',
    },
    'alternation': {
      pattern: /\|/,
      alias: 'keyword',
    },
  };

}(Prism));

(function (Prism) {

  var keywords = /\b(?:ACT|ACTIFSUB|CARRAY|CASE|CLEARGIF|COA|COA_INT|CONSTANTS|CONTENT|CUR|EDITPANEL|EFFECT|EXT|FILE|FLUIDTEMPLATE|FORM|FRAME|FRAMESET|GIFBUILDER|GMENU|GMENU_FOLDOUT|GMENU_LAYERS|GP|HMENU|HRULER|HTML|IENV|IFSUB|IMAGE|IMGMENU|IMGMENUITEM|IMGTEXT|IMG_RESOURCE|INCLUDE_TYPOSCRIPT|JSMENU|JSMENUITEM|LLL|LOAD_REGISTER|NO|PAGE|RECORDS|RESTORE_REGISTER|TEMPLATE|TEXT|TMENU|TMENUITEM|TMENU_LAYERS|USER|USER_INT|_GIFBUILDER|global|globalString|globalVar)\b/;

  Prism.languages.typoscript = {
    'comment': [
      {
        // multiline comments /* */
        pattern: /(^|[^\\])\/\*[\s\S]*?(?:\*\/|$)/,
        lookbehind: true,
      },
      {
        // double-slash comments - ignored when backslashes or colon is found in front
        // also ignored whenever directly after an equal-sign, because it would probably be an url without protocol
        pattern: /(^|[^\\:= \t]|(?:^|[^= \t])[ \t]+)\/\/.*/,
        lookbehind: true,
        greedy: true,
      },
      {
        // hash comments - ignored when leading quote is found for hex colors in strings
        pattern: /(^|[^"'])#.*/,
        lookbehind: true,
        greedy: true,
      },
    ],
    'function': [
      {
        // old include style
        pattern: /<INCLUDE_TYPOSCRIPT:\s*source\s*=\s*(?:"[^"\r\n]*"|'[^'\r\n]*')\s*>/,
        inside: {
          'string': {
            pattern: /"[^"\r\n]*"|'[^'\r\n]*'/,
            inside: {
              'keyword': keywords,
            },
          },
          'keyword': {
            pattern: /INCLUDE_TYPOSCRIPT/,
          },
        },
      },
      {
        // new include style
        pattern: /@import\s*(?:"[^"\r\n]*"|'[^'\r\n]*')/,
        inside: {
          'string': /"[^"\r\n]*"|'[^'\r\n]*'/,
        },
      },
    ],
    'string': {
      pattern: /^([^=]*=[< ]?)(?:(?!\]\n).)*/,
      lookbehind: true,
      inside: {
        'function': /\{\$.*\}/, // constants include
        'keyword': keywords,
        'number': /^\d+$/,
        'punctuation': /[,|:]/,
      },
    },
    'keyword': keywords,
    'number': {
      // special highlighting for indexes of arrays in tags
      pattern: /\b\d+\s*[.{=]/,
      inside: {
        'operator': /[.{=]/,
      },
    },
    'tag': {
      pattern: /\.?[-\w\\]+\.?/,
      inside: {
        'punctuation': /\./,
      },
    },
    'punctuation': /[{}[\];(),.:|]/,
    'operator': /[<>]=?|[!=]=?=?|--?|\+\+?|&&?|\|\|?|[?*/~^%]/,
  };

  Prism.languages.tsconfig = Prism.languages.typoscript;

}(Prism));

(function () {

  if (typeof Prism === 'undefined' || typeof document === 'undefined' || !document.querySelector) {
    return;
  }

  var LINE_NUMBERS_CLASS = 'line-numbers';
  var LINKABLE_LINE_NUMBERS_CLASS = 'linkable-line-numbers';
  var NEW_LINE_EXP = /\n(?!$)/g;

  /**
   * @param {string} selector
   * @param {ParentNode} [container]
   * @returns {HTMLElement[]}
   */
  function $$ (selector, container) {
    return Array.prototype.slice.call((container || document).querySelectorAll(selector));
  }

  /**
   * Returns whether the given element has the given class.
   *
   * @param {Element} element
   * @param {string} className
   * @returns {boolean}
   */
  function hasClass (element, className) {
    return element.classList.contains(className);
  }

  /**
   * Calls the given function.
   *
   * @param {() => any} func
   * @returns {void}
   */
  function callFunction (func) {
    func();
  }

  // Some browsers round the line-height, others don't.
  // We need to test for it to position the elements properly.
  var isLineHeightRounded = (function () {
    var res;
    return function () {
      if (typeof res === 'undefined') {
        var d = document.createElement('div');
        d.style.fontSize = '13px';
        d.style.lineHeight = '1.5';
        d.style.padding = '0';
        d.style.border = '0';
        d.innerHTML = '&nbsp;<br />&nbsp;';
        document.body.appendChild(d);
        // Browsers that round the line-height should have offsetHeight === 38
        // The others should have 39.
        res = d.offsetHeight === 38;
        document.body.removeChild(d);
      }
      return res;
    };
  }());

  /**
   * Returns the top offset of the content box of the given parent and the content box of one of its children.
   *
   * @param {HTMLElement} parent
   * @param {HTMLElement} child
   */
  function getContentBoxTopOffset (parent, child) {
    var parentStyle = getComputedStyle(parent);
    var childStyle = getComputedStyle(child);

    /**
     * Returns the numeric value of the given pixel value.
     *
     * @param {string} px
     */
    function pxToNumber (px) {
      return +px.substr(0, px.length - 2);
    }

    return child.offsetTop
      + pxToNumber(childStyle.borderTopWidth)
      + pxToNumber(childStyle.paddingTop)
      - pxToNumber(parentStyle.paddingTop);
  }

  /**
   * Returns whether the Line Highlight plugin is active for the given element.
   *
   * If this function returns `false`, do not call `highlightLines` for the given element.
   *
   * @param {HTMLElement | null | undefined} pre
   * @returns {boolean}
   */
  function isActiveFor (pre) {
    if (!pre || !/pre/i.test(pre.nodeName)) {
      return false;
    }

    if (pre.hasAttribute('data-line')) {
      return true;
    }

    if (pre.id && Prism.util.isActive(pre, LINKABLE_LINE_NUMBERS_CLASS)) {
      // Technically, the line numbers plugin is also necessary but this plugin doesn't control the classes of
      // the line numbers plugin, so we can't assume that they are present.
      return true;
    }

    return false;
  }

  var scrollIntoView = true;

  Prism.plugins.lineHighlight = {
    /**
     * Highlights the lines of the given pre.
     *
     * This function is split into a DOM measuring and mutate phase to improve performance.
     * The returned function mutates the DOM when called.
     *
     * @param {HTMLElement} pre
     * @param {string | null} [lines]
     * @param {string} [classes='']
     * @returns {() => void}
     */
    highlightLines: function highlightLines (pre, lines, classes) {
      lines = typeof lines === 'string' ? lines : (pre.getAttribute('data-line') || '');

      var ranges = lines.replace(/\s+/g, '').split(',').filter(Boolean);
      var offset = +pre.getAttribute('data-line-offset') || 0;

      var parseMethod = isLineHeightRounded() ? parseInt : parseFloat;
      var lineHeight = parseMethod(getComputedStyle(pre).lineHeight);
      var hasLineNumbers = Prism.util.isActive(pre, LINE_NUMBERS_CLASS);
      var codeElement = pre.querySelector('code');
      var parentElement = hasLineNumbers ? pre : codeElement || pre;
      var mutateActions = /** @type {(() => void)[]} */ ([]);
      var lineBreakMatch = codeElement.textContent.match(NEW_LINE_EXP);
      var numberOfLines = lineBreakMatch ? lineBreakMatch.length + 1 : 1;
      /**
       * The top offset between the content box of the <code> element and the content box of the parent element of
       * the line highlight element (either `<pre>` or `<code>`).
       *
       * This offset might not be zero for some themes where the <code> element has a top margin. Some plugins
       * (or users) might also add element above the <code> element. Because the line highlight is aligned relative
       * to the <pre> element, we have to take this into account.
       *
       * This offset will be 0 if the parent element of the line highlight element is the `<code>` element.
       */
      var codePreOffset = !codeElement || parentElement == codeElement ? 0 : getContentBoxTopOffset(pre, codeElement);

      ranges.forEach(function (currentRange) {
        var range = currentRange.split('-');

        var start = +range[0];
        var end = +range[1] || start;
        end = Math.min(numberOfLines + offset, end);

        if (end < start) {
          return;
        }

        /** @type {HTMLElement} */
        var line = pre.querySelector('.line-highlight[data-range="' + currentRange + '"]') ||
          document.createElement('div');

        mutateActions.push(function () {
          line.setAttribute('aria-hidden', 'true');
          line.setAttribute('data-range', currentRange);
          line.className = (classes || '') + ' line-highlight';
        });

        // if the line-numbers plugin is enabled, then there is no reason for this plugin to display the line numbers
        if (hasLineNumbers && Prism.plugins.lineNumbers) {
          var startNode = Prism.plugins.lineNumbers.getLine(pre, start);
          var endNode = Prism.plugins.lineNumbers.getLine(pre, end);

          if (startNode) {
            var top = startNode.offsetTop + codePreOffset + 'px';
            mutateActions.push(function () {
              line.style.top = top;
            });
          }

          if (endNode) {
            var height = (endNode.offsetTop - startNode.offsetTop) + endNode.offsetHeight + 'px';
            mutateActions.push(function () {
              line.style.height = height;
            });
          }
        } else {
          mutateActions.push(function () {
            line.setAttribute('data-start', String(start));

            if (end > start) {
              line.setAttribute('data-end', String(end));
            }

            line.style.top = (start - offset - 1) * lineHeight + codePreOffset + 'px';

            line.textContent = new Array(end - start + 2).join(' \n');
          });
        }

        mutateActions.push(function () {
          line.style.width = pre.scrollWidth + 'px';
        });

        mutateActions.push(function () {
          // allow this to play nicely with the line-numbers plugin
          // need to attack to pre as when line-numbers is enabled, the code tag is relatively which screws up the positioning
          parentElement.appendChild(line);
        });
      });

      var id = pre.id;
      if (hasLineNumbers && Prism.util.isActive(pre, LINKABLE_LINE_NUMBERS_CLASS) && id) {
        // This implements linkable line numbers. Linkable line numbers use Line Highlight to create a link to a
        // specific line. For this to work, the pre element has to:
        //  1) have line numbers,
        //  2) have the `linkable-line-numbers` class or an ascendant that has that class, and
        //  3) have an id.

        if (!hasClass(pre, LINKABLE_LINE_NUMBERS_CLASS)) {
          // add class to pre
          mutateActions.push(function () {
            pre.classList.add(LINKABLE_LINE_NUMBERS_CLASS);
          });
        }

        var start = parseInt(pre.getAttribute('data-start') || '1');

        // iterate all line number spans
        $$('.line-numbers-rows > span', pre).forEach(function (lineSpan, i) {
          var lineNumber = i + start;
          lineSpan.onclick = function () {
            var hash = id + '.' + lineNumber;

            // this will prevent scrolling since the span is obviously in view
            scrollIntoView = false;
            location.hash = hash;
            setTimeout(function () {
              scrollIntoView = true;
            }, 1);
          };
        });
      }

      return function () {
        mutateActions.forEach(callFunction);
      };
    },
  };

  function applyHash () {
    var hash = location.hash.slice(1);

    // Remove pre-existing temporary lines
    $$('.temporary.line-highlight').forEach(function (line) {
      line.parentNode.removeChild(line);
    });

    var range = (hash.match(/\.([\d,-]+)$/) || [, ''])[1];

    if (!range || document.getElementById(hash)) {
      return;
    }

    var id = hash.slice(0, hash.lastIndexOf('.'));
    var pre = document.getElementById(id);

    if (!pre) {
      return;
    }

    if (!pre.hasAttribute('data-line')) {
      pre.setAttribute('data-line', '');
    }

    var mutateDom = Prism.plugins.lineHighlight.highlightLines(pre, range, 'temporary ');
    mutateDom();

    if (scrollIntoView) {
      document.querySelector('.temporary.line-highlight').scrollIntoView();
    }
  }

  var fakeTimer = 0; // Hack to limit the number of times applyHash() runs

  Prism.hooks.add('before-sanity-check', function (env) {
    var pre = env.element.parentElement;
    if (!isActiveFor(pre)) {
      return;
    }

    /*
		 * Cleanup for other plugins (e.g. autoloader).
		 *
		 * Sometimes <code> blocks are highlighted multiple times. It is necessary
		 * to cleanup any left-over tags, because the whitespace inside of the <div>
		 * tags change the content of the <code> tag.
		 */
    var num = 0;
    $$('.line-highlight', pre).forEach(function (line) {
      num += line.textContent.length;
      line.parentNode.removeChild(line);
    });
    // Remove extra whitespace
    if (num && /^(?: \n)+$/.test(env.code.slice(-num))) {
      env.code = env.code.slice(0, -num);
    }
  });

  Prism.hooks.add('complete', function completeHook (env) {
    var pre = env.element.parentElement;
    if (!isActiveFor(pre)) {
      return;
    }

    clearTimeout(fakeTimer);

    var hasLineNumbers = Prism.plugins.lineNumbers;
    var isLineNumbersLoaded = env.plugins && env.plugins.lineNumbers;

    if (hasClass(pre, LINE_NUMBERS_CLASS) && hasLineNumbers && !isLineNumbersLoaded) {
      Prism.hooks.add('line-numbers', completeHook);
    } else {
      var mutateDom = Prism.plugins.lineHighlight.highlightLines(pre);
      mutateDom();
      fakeTimer = setTimeout(applyHash, 1);
    }
  });

  window.addEventListener('hashchange', applyHash);
  window.addEventListener('resize', function () {
    var actions = $$('pre').filter(isActiveFor).map(function (pre) {
      return Prism.plugins.lineHighlight.highlightLines(pre);
    });
    actions.forEach(callFunction);
  });

}());

(function () {

  if (typeof Prism === 'undefined' || typeof document === 'undefined') {
    return;
  }

  /**
   * Plugin name which is used as a class name for <pre> which is activating the plugin
   *
   * @type {string}
   */
  var PLUGIN_NAME = 'line-numbers';

  /**
   * Regular expression used for determining line breaks
   *
   * @type {RegExp}
   */
  var NEW_LINE_EXP = /\n(?!$)/g;

  /**
   * Global exports
   */
  var config = Prism.plugins.lineNumbers = {
    /**
     * Get node for provided line number
     *
     * @param {Element} element pre element
     * @param {number} number line number
     * @returns {Element|undefined}
     */
    getLine: function (element, number) {
      if (element.tagName !== 'PRE' || !element.classList.contains(PLUGIN_NAME)) {
        return;
      }

      var lineNumberRows = element.querySelector('.line-numbers-rows');
      if (!lineNumberRows) {
        return;
      }
      var lineNumberStart = parseInt(element.getAttribute('data-start'), 10) || 1;
      var lineNumberEnd = lineNumberStart + (lineNumberRows.children.length - 1);

      if (number < lineNumberStart) {
        number = lineNumberStart;
      }
      if (number > lineNumberEnd) {
        number = lineNumberEnd;
      }

      var lineIndex = number - lineNumberStart;

      return lineNumberRows.children[lineIndex];
    },

    /**
     * Resizes the line numbers of the given element.
     *
     * This function will not add line numbers. It will only resize existing ones.
     *
     * @param {HTMLElement} element A `<pre>` element with line numbers.
     * @returns {void}
     */
    resize: function (element) {
      resizeElements([element]);
    },

    /**
     * Whether the plugin can assume that the units font sizes and margins are not depended on the size of
     * the current viewport.
     *
     * Setting this to `true` will allow the plugin to do certain optimizations for better performance.
     *
     * Set this to `false` if you use any of the following CSS units: `vh`, `vw`, `vmin`, `vmax`.
     *
     * @type {boolean}
     */
    assumeViewportIndependence: true,
  };

  /**
   * Resizes the given elements.
   *
   * @param {HTMLElement[]} elements
   */
  function resizeElements (elements) {
    elements = elements.filter(function (e) {
      var codeStyles = getStyles(e);
      var whiteSpace = codeStyles['white-space'];
      return whiteSpace === 'pre-wrap' || whiteSpace === 'pre-line';
    });

    if (elements.length == 0) {
      return;
    }

    var infos = elements.map(function (element) {
      var codeElement = element.querySelector('code');
      var lineNumbersWrapper = element.querySelector('.line-numbers-rows');
      if (!codeElement || !lineNumbersWrapper) {
        return undefined;
      }

      /** @type {HTMLElement} */
      var lineNumberSizer = element.querySelector('.line-numbers-sizer');
      var codeLines = codeElement.textContent.split(NEW_LINE_EXP);

      if (!lineNumberSizer) {
        lineNumberSizer = document.createElement('span');
        lineNumberSizer.className = 'line-numbers-sizer';

        codeElement.appendChild(lineNumberSizer);
      }

      lineNumberSizer.innerHTML = '0';
      lineNumberSizer.style.display = 'block';

      var oneLinerHeight = lineNumberSizer.getBoundingClientRect().height;
      lineNumberSizer.innerHTML = '';

      return {
        element: element,
        lines: codeLines,
        lineHeights: [],
        oneLinerHeight: oneLinerHeight,
        sizer: lineNumberSizer,
      };
    }).filter(Boolean);

    infos.forEach(function (info) {
      var lineNumberSizer = info.sizer;
      var lines = info.lines;
      var lineHeights = info.lineHeights;
      var oneLinerHeight = info.oneLinerHeight;

      lineHeights[lines.length - 1] = undefined;
      lines.forEach(function (line, index) {
        if (line && line.length > 1) {
          var e = lineNumberSizer.appendChild(document.createElement('span'));
          e.style.display = 'block';
          e.textContent = line;
        } else {
          lineHeights[index] = oneLinerHeight;
        }
      });
    });

    infos.forEach(function (info) {
      var lineNumberSizer = info.sizer;
      var lineHeights = info.lineHeights;

      var childIndex = 0;
      for (var i = 0; i < lineHeights.length; i++) {
        if (lineHeights[i] === undefined) {
          lineHeights[i] = lineNumberSizer.children[childIndex++].getBoundingClientRect().height;
        }
      }
    });

    infos.forEach(function (info) {
      var lineNumberSizer = info.sizer;
      var wrapper = info.element.querySelector('.line-numbers-rows');

      lineNumberSizer.style.display = 'none';
      lineNumberSizer.innerHTML = '';

      info.lineHeights.forEach(function (height, lineNumber) {
        wrapper.children[lineNumber].style.height = height + 'px';
      });
    });
  }

  /**
   * Returns style declarations for the element
   *
   * @param {Element} element
   */
  function getStyles (element) {
    if (!element) {
      return null;
    }

    return window.getComputedStyle ? getComputedStyle(element) : (element.currentStyle || null);
  }

  var lastWidth = undefined;
  window.addEventListener('resize', function () {
    if (config.assumeViewportIndependence && lastWidth === window.innerWidth) {
      return;
    }
    lastWidth = window.innerWidth;

    resizeElements(Array.prototype.slice.call(document.querySelectorAll('pre.' + PLUGIN_NAME)));
  });

  Prism.hooks.add('complete', function (env) {
    if (!env.code) {
      return;
    }

    var code = /** @type {Element} */ (env.element);
    var pre = /** @type {HTMLElement} */ (code.parentNode);

    // works only for <code> wrapped inside <pre> (not inline)
    if (!pre || !/pre/i.test(pre.nodeName)) {
      return;
    }

    // Abort if line numbers already exists
    if (code.querySelector('.line-numbers-rows')) {
      return;
    }

    // only add line numbers if <code> or one of its ancestors has the `line-numbers` class
    if (!Prism.util.isActive(code, PLUGIN_NAME)) {
      return;
    }

    // Remove the class 'line-numbers' from the <code>
    code.classList.remove(PLUGIN_NAME);
    // Add the class 'line-numbers' to the <pre>
    pre.classList.add(PLUGIN_NAME);

    var match = env.code.match(NEW_LINE_EXP);
    var linesNum = match ? match.length + 1 : 1;
    var lineNumbersWrapper;

    var lines = new Array(linesNum + 1).join('<span></span>');

    lineNumbersWrapper = document.createElement('span');
    lineNumbersWrapper.setAttribute('aria-hidden', 'true');
    lineNumbersWrapper.className = 'line-numbers-rows';
    lineNumbersWrapper.innerHTML = lines;

    if (pre.hasAttribute('data-start')) {
      pre.style.counterReset = 'linenumber ' + (parseInt(pre.getAttribute('data-start'), 10) - 1);
    }

    env.element.appendChild(lineNumbersWrapper);

    resizeElements([pre]);

    Prism.hooks.run('line-numbers', env);
  });

  Prism.hooks.add('line-numbers', function (env) {
    env.plugins = env.plugins || {};
    env.plugins.lineNumbers = true;
  });

}());

(function () {

  if (typeof Prism === 'undefined' || typeof document === 'undefined') {
    return;
  }

  var CLASS_PATTERN = /(?:^|\s)command-line(?:\s|$)/;
  var PROMPT_CLASS = 'command-line-prompt';

  /** @type {(str: string, prefix: string) => boolean} */
  var startsWith = ''.startsWith
    ? function (s, p) { return s.startsWith(p); }
    : function (s, p) { return s.indexOf(p) === 0; };

  // Support for IE11 that has no endsWith()
  /** @type {(str: string, suffix: string) => boolean} */
  var endsWith = ''.endsWith
    ? function (str, suffix) {
      return str.endsWith(suffix);
    }
    : function (str, suffix) {
      var len = str.length;
      return str.substring(len - suffix.length, len) === suffix;
    };

  /**
   * Returns whether the given hook environment has a command line info object.
   *
   * @param {any} env
   * @returns {boolean}
   */
  function hasCommandLineInfo (env) {
    var vars = env.vars = env.vars || {};
    return 'command-line' in vars;
  }

  /**
   * Returns the command line info object from the given hook environment.
   *
   * @param {any} env
   * @returns {CommandLineInfo}
   *
   * @typedef CommandLineInfo
   * @property {boolean} [complete]
   * @property {number} [numberOfLines]
   * @property {string[]} [outputLines]
   */
  function getCommandLineInfo (env) {
    var vars = env.vars = env.vars || {};
    return vars['command-line'] = vars['command-line'] || {};
  }

  Prism.hooks.add('before-highlight', function (env) {
    var commandLine = getCommandLineInfo(env);

    if (commandLine.complete || !env.code) {
      commandLine.complete = true;
      return;
    }

    // Works only for <code> wrapped inside <pre> (not inline).
    var pre = env.element.parentElement;
    if (!pre || !/pre/i.test(pre.nodeName) || // Abort only if neither the <pre> nor the <code> have the class
      (!CLASS_PATTERN.test(pre.className) && !CLASS_PATTERN.test(env.element.className))) {
      commandLine.complete = true;
      return;
    }

    // The element might be highlighted multiple times, so we just remove the previous prompt
    var existingPrompt = env.element.querySelector('.' + PROMPT_CLASS);
    if (existingPrompt) {
      existingPrompt.remove();
    }

    var codeLines = env.code.split('\n');

    commandLine.numberOfLines = codeLines.length;
    /** @type {string[]} */
    var outputLines = commandLine.outputLines = [];

    var outputSections = pre.getAttribute('data-output');
    var outputFilter = pre.getAttribute('data-filter-output');
    if (outputSections !== null) { // The user specified the output lines. -- cwells
      outputSections.split(',').forEach(function (section) {
        var range = section.split('-');
        var outputStart = parseInt(range[0], 10);
        var outputEnd = range.length === 2 ? parseInt(range[1], 10) : outputStart;

        if (!isNaN(outputStart) && !isNaN(outputEnd)) {
          if (outputStart < 1) {
            outputStart = 1;
          }
          if (outputEnd > codeLines.length) {
            outputEnd = codeLines.length;
          }
          // Convert start and end to 0-based to simplify the arrays. -- cwells
          outputStart--;
          outputEnd--;
          // Save the output line in an array and clear it in the code so it's not highlighted. -- cwells
          for (var j = outputStart; j <= outputEnd; j++) {
            outputLines[j] = codeLines[j];
            codeLines[j] = '';
          }
        }
      });
    } else if (outputFilter) { // Treat lines beginning with this string as output. -- cwells
      for (var i = 0; i < codeLines.length; i++) {
        if (startsWith(codeLines[i], outputFilter)) { // This line is output. -- cwells
          outputLines[i] = codeLines[i].slice(outputFilter.length);
          codeLines[i] = '';
        }
      }
    }

    var continuationLineIndicies = commandLine.continuationLineIndicies = new Set();
    var lineContinuationStr = pre.getAttribute('data-continuation-str');
    var continuationFilter = pre.getAttribute('data-filter-continuation');

    // Identify code lines where the command has continued onto subsequent
    // lines and thus need a different prompt. Need to do this after the output
    // lines have been removed to ensure we don't pick up a continuation string
    // in an output line.
    for (var j = 0; j < codeLines.length; j++) {
      var line = codeLines[j];
      if (!line) {
        continue;
      }

      // Record the next line as a continuation if this one ends in a continuation str.
      if (lineContinuationStr && endsWith(line, lineContinuationStr)) {
        continuationLineIndicies.add(j + 1);
      }
      // Record this line as a continuation if marked with a continuation prefix
      // (that we will remove).
      if (j > 0 && continuationFilter && startsWith(line, continuationFilter)) {
        codeLines[j] = line.slice(continuationFilter.length);
        continuationLineIndicies.add(j);
      }
    }

    env.code = codeLines.join('\n');
  });

  Prism.hooks.add('before-insert', function (env) {
    var commandLine = getCommandLineInfo(env);

    if (commandLine.complete) {
      return;
    }

    // Reinsert the output lines into the highlighted code. -- cwells
    var codeLines = env.highlightedCode.split('\n');
    var outputLines = commandLine.outputLines || [];
    for (var i = 0, l = codeLines.length; i < l; i++) {
      // Add spans to allow distinction of input/output text for styling
      if (outputLines.hasOwnProperty(i)) {
        // outputLines were removed from codeLines so missed out on escaping
        // of markup so do it here.
        codeLines[i] = '<span class="token output">'
          + Prism.util.encode(outputLines[i]) + '</span>';
      } else {
        codeLines[i] = '<span class="token command">'
          + codeLines[i] + '</span>';
      }
    }
    env.highlightedCode = codeLines.join('\n');
  });

  Prism.hooks.add('complete', function (env) {
    if (!hasCommandLineInfo(env)) {
      // the previous hooks never ran
      return;
    }

    var commandLine = getCommandLineInfo(env);

    if (commandLine.complete) {
      return;
    }

    var pre = env.element.parentElement;
    if (CLASS_PATTERN.test(env.element.className)) { // Remove the class "command-line" from the <code>
      env.element.className = env.element.className.replace(CLASS_PATTERN, ' ');
    }
    if (!CLASS_PATTERN.test(pre.className)) { // Add the class "command-line" to the <pre>
      pre.className += ' command-line';
    }

    function getAttribute (key, defaultValue) {
      return (pre.getAttribute(key) || defaultValue).replace(/"/g, '&quot');
    }

    // Create the "rows" that will become the command-line prompts. -- cwells
    var promptLines = '';
    var rowCount = commandLine.numberOfLines || 0;
    var promptText = getAttribute('data-prompt', '');
    var promptLine;
    if (promptText !== '') {
      promptLine = '<span data-prompt="' + promptText + '"></span>';
    } else {
      var user = getAttribute('data-user', 'user');
      var host = getAttribute('data-host', 'localhost');
      promptLine = '<span data-user="' + user + '" data-host="' + host + '"></span>';
    }

    var continuationLineIndicies = commandLine.continuationLineIndicies || new Set();
    var continuationPromptText = getAttribute('data-continuation-prompt', '>');
    var continuationPromptLine = '<span data-continuation-prompt="' + continuationPromptText + '"></span>';

    // Assemble all the appropriate prompt/continuation lines
    for (var j = 0; j < rowCount; j++) {
      if (continuationLineIndicies.has(j)) {
        promptLines += continuationPromptLine;
      } else {
        promptLines += promptLine;
      }
    }

    // Create the wrapper element. -- cwells
    var prompt = document.createElement('span');
    prompt.className = PROMPT_CLASS;
    prompt.innerHTML = promptLines;

    // Remove the prompt from the output lines. -- cwells
    var outputLines = commandLine.outputLines || [];
    for (var i = 0, l = outputLines.length; i < l; i++) {
      if (outputLines.hasOwnProperty(i)) {
        var node = prompt.children[i];
        node.removeAttribute('data-user');
        node.removeAttribute('data-host');
        node.removeAttribute('data-prompt');
      }
    }

    env.element.insertBefore(prompt, env.element.firstChild);
    commandLine.complete = true;
  });

}());

(function () {

  if (typeof Prism === 'undefined' || typeof document === 'undefined') {
    return;
  }

  var callbacks = [];
  var map = {};
  var noop = function () {};

  Prism.plugins.toolbar = {};

  /**
   * @typedef ButtonOptions
   * @property {string} text The text displayed.
   * @property {string} [url] The URL of the link which will be created.
   * @property {Function} [onClick] The event listener for the `click` event of the created button.
   * @property {string} [className] The class attribute to include with element.
   */

  /**
   * Register a button callback with the toolbar.
   *
   * @param {string} key
   * @param {ButtonOptions|Function} opts
   */
  var registerButton = Prism.plugins.toolbar.registerButton = function (key, opts) {
    var callback;

    if (typeof opts === 'function') {
      callback = opts;
    } else {
      callback = function (env) {
        var element;

        if (typeof opts.onClick === 'function') {
          element = document.createElement('button');
          element.type = 'button';
          element.addEventListener('click', function () {
            opts.onClick.call(this, env);
          });
        } else if (typeof opts.url === 'string') {
          element = document.createElement('a');
          element.href = opts.url;
        } else {
          element = document.createElement('span');
        }

        if (opts.className) {
          element.classList.add(opts.className);
        }

        element.textContent = opts.text;

        return element;
      };
    }

    if (key in map) {
      console.warn('There is a button with the key "' + key + '" registered already.');
      return;
    }

    callbacks.push(map[key] = callback);
  };

  /**
   * Returns the callback order of the given element.
   *
   * @param {HTMLElement} element
   * @returns {string[] | undefined}
   */
  function getOrder (element) {
    while (element) {
      var order = element.getAttribute('data-toolbar-order');
      if (order != null) {
        order = order.trim();
        if (order.length) {
          return order.split(/\s*,\s*/g);
        } else {
          return [];
        }
      }
      element = element.parentElement;
    }
  }

  /**
   * Post-highlight Prism hook callback.
   *
   * @param env
   */
  var hook = Prism.plugins.toolbar.hook = function (env) {
    // Check if inline or actual code block (credit to line-numbers plugin)
    var pre = env.element.parentNode;
    if (!pre || !/pre/i.test(pre.nodeName)) {
      return;
    }

    // Autoloader rehighlights, so only do this once.
    if (pre.parentNode.classList.contains('code-toolbar')) {
      return;
    }

    // Create wrapper for <pre> to prevent scrolling toolbar with content.
    var wrapper = document.createElement('div');
    wrapper.classList.add('code-toolbar');
    pre.parentNode.insertBefore(wrapper, pre);

    // Append header.
    var header = document.createElement('div');
    header.classList.add('code-toolbar-header');
    wrapper.appendChild(header);
    wrapper.appendChild(pre);

    var buttons = document.createElement('div');
    buttons.classList.add('code-toolbar-os');
    buttons.appendChild(document.createElement('div'));
    buttons.appendChild(document.createElement('div'));
    buttons.appendChild(document.createElement('div'));
    header.appendChild(buttons);

    var title = document.createElement('div');
    title.classList.add('code-toolbar-title');
    header.appendChild(title);

    // Setup the toolbar
    var toolbar = document.createElement('div');
    toolbar.classList.add('toolbar');

    // order callbacks
    var elementCallbacks = callbacks;
    var order = getOrder(env.element);
    if (order) {
      elementCallbacks = order.map(function (key) {
        return map[key] || noop;
      });
    }

    elementCallbacks.forEach(function (callback) {
      var element = callback(env);
      if (!element) {
        return;
      }

      var item = document.createElement('div');
      item.classList.add('toolbar-item');

      item.appendChild(element);
      toolbar.appendChild(item);
    });

    // Add our toolbar to the currently created wrapper of <pre> tag
    title.appendChild(toolbar);
  };

  registerButton('label', function (env) {
    var pre = env.element.parentNode;
    if (!pre || !/pre/i.test(pre.nodeName)) {
      return;
    }

    if (!pre.hasAttribute('data-label')) {
      return;
    }

    var element;
    var template;
    var text = pre.getAttribute('data-label');
    try {
      // Any normal text will blow up this selector.
      template = document.querySelector('template#' + text);
    } catch (e) { /* noop */ }

    if (template) {
      element = template.content;
    } else {
      if (pre.hasAttribute('data-url')) {
        element = document.createElement('a');
        element.href = pre.getAttribute('data-url');
      } else {
        element = document.createElement('span');
      }

      element.textContent = text;
    }

    return element;
  });

  /**
   * Register the toolbar with Prism.
   */
  Prism.hooks.add('complete', hook);
}());

(function () {

  if (typeof Prism === 'undefined' || typeof document === 'undefined') {
    return;
  }

  if (!Prism.plugins.toolbar) {
    console.warn('Copy to Clipboard plugin loaded before Toolbar plugin.');

    return;
  }

  /**
   * When the given elements is clicked by the user, the given text will be copied to clipboard.
   *
   * @param {HTMLElement} element
   * @param {CopyInfo} copyInfo
   *
   * @typedef CopyInfo
   * @property {() => string} getText
   * @property {() => void} success
   * @property {(reason: unknown) => void} error
   */
  function registerClipboard (element, copyInfo) {
    element.addEventListener('click', function () {
      copyTextToClipboard(copyInfo);
    });
  }

  // https://stackoverflow.com/a/30810322/7595472

  /** @param {CopyInfo} copyInfo */
  function fallbackCopyTextToClipboard (copyInfo) {
    var textArea = document.createElement('textarea');
    textArea.value = copyInfo.getText();

    // Avoid scrolling to bottom
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.position = 'fixed';

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      var successful = document.execCommand('copy');
      setTimeout(function () {
        if (successful) {
          copyInfo.success();
        } else {
          copyInfo.error();
        }
      }, 1);
    } catch (err) {
      setTimeout(function () {
        copyInfo.error(err);
      }, 1);
    }

    document.body.removeChild(textArea);
  }

  /** @param {CopyInfo} copyInfo */
  function copyTextToClipboard (copyInfo) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(copyInfo.getText()).then(copyInfo.success, function () {
        // try the fallback in case `writeText` didn't work
        fallbackCopyTextToClipboard(copyInfo);
      });
    } else {
      fallbackCopyTextToClipboard(copyInfo);
    }
  }

  /**
   * Selects the text content of the given element.
   *
   * @param {Element} element
   */
  function selectElementText (element) {
    // https://stackoverflow.com/a/20079910/7595472
    window.getSelection().selectAllChildren(element);
  }

  /**
   * Traverses up the DOM tree to find data attributes that override the default plugin settings.
   *
   * @param {Element} startElement An element to start from.
   * @returns {Settings} The plugin settings.
   * @typedef {Record<'copy' | 'copy-error' | 'copy-success' | 'copy-timeout', string | number>} Settings
   */
  function getSettings (startElement) {
    /** @type {Settings} */
    var settings = {
      'copy': 'Copy',
      'copy-error': 'Press Ctrl+C to copy',
      'copy-success': 'Copied!',
      'copy-timeout': 5000,
    };

    var prefix = 'data-prismjs-';
    for (var key in settings) {
      var attr = prefix + key;
      var element = startElement;
      while (element && !element.hasAttribute(attr)) {
        element = element.parentElement;
      }
      if (element) {
        settings[key] = element.getAttribute(attr);
      }
    }
    return settings;
  }

  Prism.plugins.toolbar.registerButton('copy-to-clipboard', function (env) {
    var element = env.element;

    var settings = getSettings(element);

    var linkCopy = document.createElement('button');
    linkCopy.className = 'copy-to-clipboard-button';
    linkCopy.setAttribute('type', 'button');
    var linkSpan = document.createElement('span');
    linkCopy.appendChild(linkSpan);

    setState('copy');

    registerClipboard(linkCopy, {
      getText: function () {
        return element.textContent;
      },
      success: function () {
        setState('copy-success');

        resetText();
      },
      error: function () {
        setState('copy-error');

        setTimeout(function () {
          selectElementText(element);
        }, 1);

        resetText();
      },
    });

    return linkCopy;

    function resetText () {
      setTimeout(function () { setState('copy'); }, settings['copy-timeout']);
    }

    /** @param {'copy' | 'copy-error' | 'copy-success'} state */
    function setState (state) {
      linkSpan.textContent = settings[state];
      linkCopy.setAttribute('data-copy-state', state);
    }
  });
}());

(function () {

  if (typeof Prism === 'undefined') {
    return;
  }

  var LANGUAGE_REGEX = /^diff-([\w-]+)/i;
  var HTML_TAG = /<\/?(?!\d)[^\s>\/=$<%]+(?:\s(?:\s*[^\s>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+(?=[\s>]))|(?=[\s/>])))+)?\s*\/?>/g;
  //this will match a line plus the line break while ignoring the line breaks HTML tags may contain.
  var HTML_LINE = RegExp(/(?:__|[^\r\n<])*(?:\r\n?|\n|(?:__|[^\r\n<])(?![^\r\n]))/.source.replace(/__/g,
    function () { return HTML_TAG.source; }), 'gi');

  var warningLogged = false;

  Prism.hooks.add('before-sanity-check', function (env) {
    var lang = env.language;
    if (LANGUAGE_REGEX.test(lang) && !env.grammar) {
      env.grammar = Prism.languages[lang] = Prism.languages.diff;
    }
  });
  Prism.hooks.add('before-tokenize', function (env) {
    if (!warningLogged && !Prism.languages.diff && !Prism.plugins.autoloader) {
      warningLogged = true;
      console.warn('Prism\'s Diff Highlight plugin requires the Diff language definition (prism-diff.js).' +
        'Make sure the language definition is loaded or use Prism\'s Autoloader plugin.');
    }

    var lang = env.language;
    if (LANGUAGE_REGEX.test(lang) && !Prism.languages[lang]) {
      Prism.languages[lang] = Prism.languages.diff;
    }
  });

  Prism.hooks.add('wrap', function (env) {
    var diffLanguage;
    var diffGrammar;

    if (env.language !== 'diff') {
      var langMatch = LANGUAGE_REGEX.exec(env.language);
      if (!langMatch) {
        return; // not a language specific diff
      }

      diffLanguage = langMatch[1];
      diffGrammar = Prism.languages[diffLanguage];
    }

    var PREFIXES = Prism.languages.diff && Prism.languages.diff.PREFIXES;

    // one of the diff tokens without any nested tokens
    if (PREFIXES && env.type in PREFIXES) {
      /** @type {string} */
      var content = env.content.replace(HTML_TAG, ''); // remove all HTML tags

      /** @type {string} */
      var decoded = content.replace(/&lt;/g, '<').replace(/&amp;/g, '&');

      // remove any one-character prefix
      var code = decoded.replace(/(^|[\r\n])./g, '$1');

      // highlight, if possible
      var highlighted;
      if (diffGrammar) {
        highlighted = Prism.highlight(code, diffGrammar, diffLanguage);
      } else {
        highlighted = Prism.util.encode(code);
      }

      // get the HTML source of the prefix token
      var prefixToken = new Prism.Token('prefix', PREFIXES[env.type], [/\w+/.exec(env.type)[0]]);
      var prefix = Prism.Token.stringify(prefixToken, env.language);

      // add prefix
      var lines = [];
      var m;
      HTML_LINE.lastIndex = 0;
      while ((m = HTML_LINE.exec(highlighted))) {
        lines.push(prefix + m[0]);
      }
      if (/(?:^|[\r\n]).$/.test(decoded)) {
        // because both "+a\n+" and "+a\n" will map to "a\n" after the line prefixes are removed
        lines.push(prefix);
      }
      env.content = lines.join('');

      if (diffGrammar) {
        env.classes.push('language-' + diffLanguage);
      }
    }
  });

}());

(function () {

  if (typeof Prism === 'undefined') {
    return;
  }

  Prism.languages.treeview = {
    'treeview-part': {
      pattern: /^.+/m,
      inside: {
        'entry-line': [
          {
            pattern: /\|-- |├── /,
            alias: 'line-h',
          },
          {
            pattern: /\| {3}|│ {3}/,
            alias: 'line-v',
          },
          {
            pattern: /`-- |└── /,
            alias: 'line-v-last',
          },
          {
            pattern: / {4}/,
            alias: 'line-v-gap',
          },
        ],
        'entry-name': {
          pattern: /.*\S.*/,
          inside: {
            // symlink
            'operator': / -> /,
          },
        },
      },
    },
  };

  Prism.hooks.add('wrap', function (env) {
    if (env.language === 'treeview' && env.type === 'entry-name') {
      var classes = env.classes;

      var folderPattern = /(^|[^\\])\/\s*$/;
      if (folderPattern.test(env.content)) {
        // folder

        // remove trailing /
        env.content = env.content.replace(folderPattern, '$1');
        classes.push('dir');
      } else {
        // file

        // remove trailing file marker
        env.content = env.content.replace(/(^|[^\\])[=*|]\s*$/, '$1');

        var parts = env.content.toLowerCase().replace(/\s+/g, '').split('.');
        while (parts.length > 1) {
          parts.shift();
          // Ex. 'foo.min.js' would become '<span class="token keyword ext-min-js ext-js">foo.min.js</span>'
          classes.push('ext-' + parts.join('-'));
        }
      }

      if (env.content[0] === '.') {
        classes.push('dotfile');
      }
    }
  });
}());

