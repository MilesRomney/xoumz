module.exports = function(root, requireModule) {
  const { definePropertyRO, definePropertyRW, noe } = requireModule('./base/utils');

  const PERMISSION = {
    READ: 0x01,
    WRITE: 0x02,
    EXECUTE: 0x04
  };

  PERMISSION.FULL = PERMISSION.READ | PERMISSION.WRITE | PERMISSION.EXECUTE;

  class Role {
    constructor(flags, order, name = 'anonymous') {
      definePropertyRO(this, 'flags', flags || 0);
      definePropertyRO(this, 'name', name);
    }
  }

  // Static properties
  Object.assign(Role, {
    PERMISSION
  });

  class PermissionEngine {
    static createInstance(Klass, opts) {
      return new Klass(opts);
    }

    constructor(_opts) {
      var opts = _opts || {};

      definePropertyRW(this, 'options', opts);
      definePropertyRW(this, '_roles', {});

      if (opts.ownerRole !== false) {
        this.registerRole('owner', (opts.ownerRole instanceof Function) ? opts.ownerRole : (primary, target) => {
          if (noe(primary))
            return;

          var ol = primary.calculateOwnerGeneration(target),
              weight = (ol) ? (1 / ol) : 0,
              flags = 0;

          if (weight >= 1)
            flags = PERMISSION.FULL;
          else if (weight > 0)
            flags = PERMISSION.READ;

          return (flags) ? new Role(flags, 'owner') : undefined;
        });
      }

      if (opts.adminRole !== false) {
        this.registerRole('admin', (opts.adminRole instanceof Function) ? opts.adminRole : (primary, target) => {
          var { primaryHasRole, targetHasRole } = this.hasRole('admin', primary, target);

          // If primary is an admin, they have full access
          if (primaryHasRole)
            return new Role(PERMISSION.FULL, 'admin');
          // If neither have an admin role, there is no affect
          else if (!targetHasRole && !primaryHasRole)
            return;

          // Otherwise block them completely
          return new Role(0, 'admin');
        });
      }
    }

    async onStart() {
    }

    registerRole(name, getter) {
      this._roles[name] = getter;
    }

    getSchemaEngine() {
      return this.getApplication().getSchemaEngine();
    }

    getRootRole() {
      // Default is deny all
      return new Role(0, 'root');
    }

    hasRole(roleName, primary, target) {
      var primaryHasRole = false,
          targetHasRole = false;

      if (primary && primary.hasRole instanceof Function)
        primaryHasRole = primary.hasRole(roleName);

      if (target && target.hasRole instanceof Function)
        targetHasRole = target.hasRole(roleName);

      return {
        primaryHasRole,
        targetHasRole
      };
    }

    getPermissionRole(roleName, primary, target) {
      var getterFunc = this._roles[roleName];
      if (!(getterFunc instanceof Function) && primary && primary.getPermissionRole instanceof Function)
        getterFunc = primary.getPermissionRole.bind(primary);

      if (!(getterFunc instanceof Function))
        return;

      return getterFunc.call(this, primary, target);
    }

    getPermissionLevel(primary, target) {
      if (noe(primary))
        return 0;

      var primaryRoles = primary.getRoles(),
          targetRoles = (target && target !== primary && target.getRoles instanceof Function) ? target.getRoles() : [],
          alreadyVisited = {},
          roles = Object.keys(this._roles).concat(primaryRoles, targetRoles).reduce((arr, roleName) => {
            if (alreadyVisited[roleName])
              return arr;

            alreadyVisited[roleName] = true;

            var level = this.getPermissionRole(roleName, primary, target);
            if (level instanceof Role)
              arr.push(level);

            return arr;
          }, []),
          permissionLevel = ~0;

      // roles = roles.sort((a, b) => {
      //   var x = a.order,
      //       y = b.order;

      //   return (x == y) ? 0 : (x < y) ? -1 : 1;
      // });

      if (!roles.length)
        return 0;

      for (var i = 0, il = roles.length; i < il; i++) {
        var role = roles[i],
            flags = role.flags;

        permissionLevel &= flags;
        if (permissionLevel === 0)
          break;
      }

      return permissionLevel;
    }
  }

  Object.assign(root, {
    Role,
    PermissionEngine
  });
};
