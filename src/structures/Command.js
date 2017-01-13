const DiscordJS = require('discord.js');
const Constants = require('../Constants');

/**
 * Options to be passed to used in a command
 * @typedef {Object} CommandOptions
 * @property {boolean} [caseSensitive=true] Whether or not the command should be case sensitive
 * @property {boolean} [dmOnly=false] Whether or not the command can only be ran in direct messages only
 * @property {boolean} [guildOnly=false] Whether or not the command can only be ran in a guild text channel. Cannot be true if dmOnly is true
 * @property {string} [description=Default Description] The description of the command
 * @property {string} [usage=command ID] The usage for the command
 * @property {Array.<EvaluatedPermissions>|Array.<string>|function} [permissions=@everyone] Can be a EvaluatedPermission object, a permission string, a role name, or a function __must return a boolean__.
 * @property {string|function} [roles=@everyone] Can be a EvaluatedPermission object, a permission string, a role name, or a function __must return a boolean__.
 * @property {string|regex|function|Array<string>} [comparator=none] A string/regex to test the incoming message against, or function that returns a boolean, or and array of strings
 */

/**
 * The Command Object
 */
class Command {
  /**
   * @param {string} id The ID of the command.
   * @param {?CommandOptions} options Option to be passed to the command.
   * @param {?Command} parent Command will only have a parent if it is registered as a sub command
   */
  constructor(id, ...params) {
    const [options, parent] = params;

    /**
     * The ID of the command
     * @type {string}
     * @readonly
     */
    this.id = id;

    /**
     * The parent command, If the command is a sub command
     * @type {?Command}
     * @private
     */
    this._parent = parent;

    /**
     * If the command is case sensitive
     * @type {boolean}
     * @readonly
     */
    this.caseSensitive = true;
    /**
     * If the command can only be used in DM/GroupDM.
     * @type {boolean}
     * @readonly
     */
    this.dmOnly = false;

    /**
     * If the command can only be used in a guild channel. Cannot be true is dmOnly is true.
     * @type {boolean}
     * @readonly
     */
    this.guildOnly = false;

    /**
     * The description of the command
     * @type {string}
     */
    this.description = 'Default Description';

    /**
     * The usage of the command
     * @type {string}
     */
    this.usage = this.parent instanceof Command ? `${this.parent.id} ${this.id}` : `${this.id}`;

    /**
     * The aliases of the command
     * @type {Array<string>}
     */
    this.names = [];

    this.options = Constants.mergeDefaults(Constants.defaults.CommandOptions, options);
    this.dmOnly = this.options.dmOnly;
    this.guildOnly = this.dmOnly === true ? false : this.options.guildOnly;

    /**
     * Commands comparative function
     * @type {string|regex|function|Array<string>} [comparator=none] A string/regex to test the incoming message against, or function that returns a boolean, or and array of strings
     * @readonly
     */
    this._comparator = this.options.comparator || this.id;

    this._permissions = this.options.permissions;

    /**
     * Collection of subCommands
     * @type {Collection<Command>}
     */
    this.subCommands = new DiscordJS.Collection();

    /**
     * Collection of subCommands aliases
     * @type {Collection<string>}
     */
    this.subCommandAliases = new DiscordJS.Collection();
  }
  /**
   * Registers a command
   * @param {Command|string} CommandOrId The subCommand to register or the id to use
   * @param {function|string|Array<string|function>|falsy} [msgGenerator] The how to respond to the message
   * @param {CommandOptions} [options] The options to pass to the subCommand
   */
  registerSubCommand(CommandOrId, msgGenerator, options) {
    if (CommandOrId instanceof Command) {
      this.subCommands.set(CommandOrId.id, CommandOrId);
    } else if (typeof CommandOrId === 'string') {
      this.subCommands.set(CommandOrId, new Command(CommandOrId, msgGenerator, options, this));
    }
  }

  /**
   * Registers an alias for a subCommand
   * @param {Command} subCommand The command to set an alias for
   * @param {string|Array<string>} alias t
   */
  setSubAlias(subCommand, alias) {
    this.subCommandAliases.set(alias, subCommand);
  }

  _addAlias(alias) {
    if (this._comparator instanceof Array !== true) this._comparator = [this._comparator];
    if (this.Parent instanceof Command) {
      if (alias instanceof Array) {
        return alias.forEach(name => {
          this.Parent.setSubAlias(this, this.caseSensitive ? name : name.toLowerCase());
          if (this.names.indexOf(name) === -1) this.names.push(this.caseSensitive ? name : name.toLowerCase());
        });
      } else if (typeof alias === 'string') {
        if (this.names.indexOf(alias) === -1) this.names.push(this.caseSensitive ? alias : alias.toLowerCase());
        return this.Parent.setSubAlias(this, this.caseSensitive ? alias : alias.toLowerCase());
      }
    }
    if (alias instanceof Array) {
      alias.forEach(name => this.names.indexOf(name) === -1 ? this._comparator.push(this.caseSensitive ? name : name.toLowerCase()) : null);
    } else if (typeof alias === 'string') {
      if (this.names.indexOf(alias) === -1) this._comparator.push(this.caseSensitive ? alias : alias.toLowerCase());
    }
    return new Error('Alias must be a string or an array of strings');
  }
  /**
   * Registers an alias for this command
   * @param {string|Array<string>} alias A string or array of strings to set as an alias for the command
   */
  setAlias(alias) {
    this._addAlias(alias);
  }

  /**
   * The function to be executed when the command is called from a GuildChannel
   * @param {external:Message} message The message that is running the command
   * @param {external:User} author The user that sent the message
   * @param {external:GuildChannel} channel The channel the command was executed in
   * @param {Guild} guild The guild that the command was executed in
   * @param {Client} client The client handling the command
   */
  message() {
    return;
  }

  /**
   * The function to be executed when the command is called from a GroupDMChannel or DMChannel
   * @param {external:Message} message The message that is running the command
   * @param {external:User} author The user that sent the message
   * @param {external:DMChannel|external:GroupDMChannel} channel The channel the command was executed in
   * @param {Client} client The client handling the command
   */
  dmOrGroup() {
    return;
  }

  /**
   *
   * @param {GuildMember} member The GuildMember to check for authorization
   * @returns {boolean}
   */
  checkAuthorization() {
    return true;
  }

  register(client) {
    this.client = client;
  }

  get aliases() {
    if (this.Parent instanceof Command) {
      return this.Parent.subCommandAliases.get(this._id);
    } else {
      return this.Parent.aliases.get(this._id);
    }
  }

  get permissions() {
    return this._permissions || '@everyone';
  }

  get comparator() {
    return this._comparator;
  }

  get responses() {
    return this._responses;
  }
  get parent() {
    return this._parent;
  }
}

module.exports = Command;
