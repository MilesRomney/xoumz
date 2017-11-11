import { definePropertyRO, definePropertyRW, noe, instanceOf, humanifyArrayItems } from '../utils';
import { required } from './validators';

(function(root) {
  function getContext(_context) {
    var context = (noe(_context)) ? '*' : _context,
        specifiedContext = this._contexts[context];
    
    if (!specifiedContext) {
      specifiedContext = {};
      definePropertyRO(this._contexts, context, specifiedContext);
    }
    
    return specifiedContext;
  }

  function ASSERT_TYPE(...types) {
    return function(val, propName) {
      if (val === undefined || val === null)
        return null;

      if (!instanceOf(val, ...types))
        throw new Error(propName + ' must be a ' + humanifyArrayItems(types));

      return val;
    };
  }

  class SchemaType {
    constructor(typeName) {
      const LNOP = () => { return this; },
            defineStaticProp = (name, defaultValue, _altValue, _cb) => {
              var altValue = (_altValue === undefined) ? !defaultValue : _altValue;

              if (!(_cb instanceof Function) && !defaultContext.hasOwnProperty('_' + name))
                definePropertyRW(defaultContext, '_' + name, defaultValue);

              definePropertyRO(
                this,
                name,
                undefined,
                (_cb instanceof Function)
                  ? () => { _cb.call(this); return this; }
                  : () => { this.setProp(name, altValue, this._context); return this; },
                LNOP
              );
            },
            defineProp = (name, defaultValue, _cb, _valueChecker) => {
              definePropertyRW(defaultContext, '_' + name, defaultValue);
              definePropertyRO(this, name, (_cb instanceof Function) ? _cb : (_val) => {
                var val = _val;
                if (_valueChecker instanceof Function)
                  val = _valueChecker.call(this, val, name);

                this.setProp(name, val, this._context);
                return this;
              });
            };

      definePropertyRO(this, 'typeName', typeName);

      var contexts = {};
      definePropertyRW(this, '_context', '*');
      definePropertyRO(this, '_contexts', contexts);

      var defaultContext = getContext.call(this);

      defineStaticProp('notNull', false);
      defineStaticProp('primaryKey', false);
      defineStaticProp('forignKey', false);
      defineStaticProp('required', undefined, undefined, () => { this.validate(required); });

      defineProp('defaultValue', null);
      defineProp('field', null);

      defineProp('setter', (val) => val, undefined, root.ASSERT_TYPE('function'));
      defineProp('getter', (val) => val, undefined, root.ASSERT_TYPE('function'));
    }

    context(name, cb) {
      if (!instanceOf(name, 'string') || noe(name))
        throw new Error('Context name must be a valid string');

      if (!(cb instanceof Function))
        throw new Error('Context scope callback must be a function');

      this._context = name;
      cb.call(this, this);
      
      return this;
    }

    getProp(name, _opts) {
      var opts = (instanceOf(_opts, 'string')) ? { context: opts } : (_opts || {}),
          specifiedContext = getContext.call(this, opts.context),
          propName = '_' + name,
          propValue = (!specifiedContext.hasOwnProperty(propName)) ? this._contexts['*'][propName] : specifiedContext[propName];
      
      if (opts.unwind && propValue instanceof Function)
        propValue = propValue.call(opts.parent || {}, name, this);

      return propValue;
    }

    setProp(name, val, context) {
      var opts = (instanceOf(_opts, 'string')) ? { context: opts } : (_opts || {}),
          specifiedContext = getContext.call(this, opts.context),
          propName = '_' + name;

      if (!specifiedContext.hasOwnProperty(propName))
        definePropertyRW(specifiedContext, propName, val);
      else
        specifiedContext[propName] = val;
      
      return this;
    }

    allowNull(val) {
      this.setProp('notNull', !val, this._context);
      return this;
    }

    validate(cb) {
      if (!(cb instanceof Function))
        throw new Error('Validator must be a function');

      var specifiedContext = getContext.call(this, this._context),
          validators = specifiedContext._validators;

      if (!validators) {
        validators = [];
        definePropertyRW(specifiedContext, '_validators', validators);
      }

      validators.push(cb);

      return this;
    }

    field() {

    }
  }

  class IntegerType extends SchemaType {
    constructor() {
      super('Integer');
    }
  }

  class DecimalType extends SchemaType {
    constructor() {
      super('Decimal');
    }
  }

  class DateTimeType extends SchemaType {
    constructor() {
      super('DateTime');
    }
  }

  class DateType extends SchemaType {
    constructor() {
      super('Date');
    }
  }

  class TimeType extends SchemaType {
    constructor() {
      super('Time');
    }
  }

  class StringType extends SchemaType {
    constructor() {
      super('String');
    }
  }

  class BooleanType extends SchemaType {
    constructor() {
      super('Boolean');
    }
  }

  const DefaultSchemaTypes = {
          'Integer': IntegerType,
          'Decimal': DecimalType,
          'Date': DateType,
          'Time': TimeType,
          'DateTime': DateTimeType,
          'String': StringType,
          'Boolean': BooleanType
        },
        SchemaTypes = {},
        NOP = () => { return SchemaTypes };

  function oneOfType(...args) {
    return args;
  }

  function arrayOfType(...args) {
    return [oneOfType(...args)];
  }

  function defineSchemaType(schema, name, TypeKlass) {
    Object.defineProperty(SchemaTypes, name, {
      enumerable: true,
      configurable: true,
      get: () => {
        return new TypeKlass();
      },
      set: NOP
    });
  }

  function iterateDefaultSchemaTypes(cb) {
    var keys = Object.keys(DefaultSchemaTypes);
    for (var i = 0, il = keys.length; i < il; i++) {
      var key = keys[i];
      cb(key, DefaultSchemaTypes[key]);  
    }
  }

  iterateDefaultSchemaTypes((name, type) => {
    defineSchemaType(SchemaTypes, name, type);
  });

  definePropertyRW(SchemaTypes, 'oneOf', oneOfType);
  definePropertyRW(SchemaTypes, 'arrayOf', arrayOfType);

  Object.assign(root, {
    ASSERT_TYPE,
    SchemaType,
    SchemaTypes,
    DefaultSchemaTypes,
    defineSchemaType,
    iterateDefaultSchemaTypes
  });
})(module.exports);