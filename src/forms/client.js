Form = function(options) {
  var self = this;
  options = _.extend({}, options);

  // Set defaults
  options.layout = options.layout || 'basic';
  var classes = options.classes ? options.classes : [];
  options.classes = _.isString(options.classes) ? options.classes.split(' ') : options.classes;
  options.inputLayout = options.inputLayout || 'basic';
  options.actionLayout = (options.layout === 'horizontal') ? 'horizontal' : 'basic';
  options.labelByDefault = _.isBoolean(options.labelByDefault) ? options.labelByDefault : true;
  options.autoPlaceholders = _.isBoolean(options.autoPlaceholders) ? options.autoPlaceholders : false;
  options.noInputLabels = _.isBoolean(options.noInputLabels) ? options.noInputLabels : false;

  // Figure out classes
  options.classes = _.flatten([options.classes, 'form-' + options.layout]).join(' ');

  this.on('success', function() {
    self._loadingStop();
  });
  this.on('errors', function() {
    self._loadingStop();
  });
  this.on('submit', function() {
    self._loadingStart();
  });
  
  this.options = options;
};

_.extend(Form.prototype, Events);

Form.prototype._loadingStart = function() {
  var self = this;
  Meteor.defer(function() {
    self.$form.find(':input').prop('disabled', true);
    self.$form.find('.spinner').removeClass('hide');
  });
};

Form.prototype._loadingStop = function() {
  var self = this;
  Meteor.defer(function() {
    self.$form.find(':input').prop('disabled', false);
    self.$form.find('.spinner').addClass('hide');
  });
};

Form.prototype.tag = function(form) {
  var self = this;

  // Tag gets all the options set in the form constructor
  this.tag = _.extend({}, this.options);

  // Build up the fieldsets and inputs
  if (form.fieldsets)
    this.tag.fieldsets = self._parseFieldsets(form.fieldsets);
  else
    this.tag.inputs = self._parseInputs(form.inputs);

  // Build up the form actions
  if (form.actions)
    this.tag.actions = self._parseActions(form.actions);

  return this;
};

Form.prototype.render = function() {
  var self = this;
  
  // Keep a reference to the form
  Meteor.defer(function() {
    self.$form = $('#' + self.tag.name + 'Form');
    self.form = self.$form.get(0);
  });

  // Update the display with a success or error message
  Session.set(this.tag.name + 'Success', null);
  Session.set(this.tag.name + 'Errors', null);

  // Add events and render it
  Template.form.events = this._events();
  return Template.form(this.tag);
};
// Alias to toString so the form get's rendered when
// it's added to a template
Form.prototype.toString = Form.prototype.render;

Form.prototype._handleErrors = function(errors) {
  this.trigger('errors', errors);

  Session.set(this.tag.name + 'Errors', errors);
  Session.set(this.tag.name + 'Success', null);
};

Form.prototype._handleSuccess = function(message) {
  this.trigger('success', message);

  this.$form.find(':input').val('');
  this.$form.find(':checkbox').prop('checked', false);
  Session.set(this.tag.name + 'Success', message);
  Session.set(this.tag.name + 'Errors', null);
};

Form.prototype._onSubmit = function() {
  var self = this;
  var success, formValues,
      validatorClass, validator;

  this.trigger('submit', self);

  formValues = form2js(self.form)[self.tag.name] || {};
  validatorClass = _.constantize(self.tag.name + '_validator');
  if (validatorClass) {
    validator = new validatorClass(formValues);

    if (validator.isValid()) {
      Meteor.call(self.options.method, formValues, function(errors, formValues) {
        if (errors) {
          self._handleErrors(errors);
        } else {
          self._handleSuccess(validator.validate.successMessage);
        }
      });
    } else {
      self._handleErrors(validator.errors);
    }
  } else {
    if (self.options.method) {
      if (_.isFunction(self.options.method)) {
        self.options.method(function(errors) {
          if (errors) {
            self._handleErrors(errors);
          } else {
            self._handleSuccess(self.tag.successMessage);
          }
        });
      }
    }
  }
};

Form.prototype._events = function() {
  var self = this;
  return {
    'click .cancelAction': function(e) {
      e.preventDefault();
      // self._onCancel();
    },
    'keydown .cancelAction': function(e) {

      // Return or space bar on the button should cancel the form
      if (_.isSubmitKey(e)) {
        e.preventDefault();
        // self._onCancel();
      }
    },
    'click .submitAction': function(e) {
      e.preventDefault();
      self._onSubmit();
    },
    'keydown .submitAction': function(e) {

      // Return or space bar on the button should submit the form
      if (_.isSubmitKey(e)) {
        e.preventDefault();
        self._onSubmit();
      }
    },
    'keydown input': function(e) {

      // Hitting enter on an input that isn't a button
      if (_.isReturnKey(e) && !$(e.target).hasClass('btn')) {
        e.preventDefault();

        // Save field if it's a liveEdit field
        if (false) {
      
        // Otherwise submit the form
        } else {
          self._onSubmit();
        }
      }
    }
  }
};

Form.prototype._parse = function(form) {
  return this._pairStringsWithObjects(form, 'name');
};

Form.prototype._pairStringsWithObjects = function(rawList, keyName) {
  var list = [];
  _.each(rawList, function(stringOrObject, index) {
    var obj;
    if (_.isString(stringOrObject)) {
      var peek = rawList[index+1];
      if (_.isObject(peek)) {
        obj = _.clone(peek);
        obj[keyName] = stringOrObject;
        peek._merged = true;
      } else {
        obj = {};
        obj[keyName] = stringOrObject;
      }
      list.push(obj);
    } else if (!stringOrObject._merged) {
      list.push(stringOrObject);
    }
  });
  return list;
};

Form.prototype._parseFieldsets = function(fieldsets) {
  var self = this;
  fieldsets = this._parse(fieldsets);

  return _.map(fieldsets, function(fieldset) {
    fieldset.inputs = self._parseInputs(fieldset.inputs);
    fieldset.name = _.humanize(fieldset.name);
    return fieldset;
  });
};

Form.prototype._parseInputs = function(inputs) {
  var self = this;
  inputs = self._parse(inputs);
  
  inputs = _.map(inputs, function(input) {

    // Figure out which classes it should have
    var classes = _.ensureArray(input.classes).join(' ');
    if (self.options.inputClasses)
      classes = classes + ' ' + self.options.inputClasses.join(' ');
    
    // Calculate all the values the input will need
    var name = self.options.name + '.' + input.name;
    var id = self.options.name + '_' + input.name;
    var as = input.as || 'text';
    var placeholder = self.options.autoPlaceholders ? _.humanize(input.name) : input.placeholder;

    // Calculate label if world peace exists
    var label = (
      !self.options.noInputLabels
        &&
      (
        input.label
          ||
        self.options.labelByDefault
      )
    ) ? (input.label || _.humanize(input.name)) : null;

    return {
      as: as,
      classes: classes,
      name: name,
      id: id,
      label: label,
      placeholder: placeholder,
      hint: input.hint,
      layout: self.options.layout,
      inputLayout: self.options.inputLayout
    };
  });
  return inputs;
};

Form.prototype._parseActions = function(actions) {
  var self = this;

  actions = this._parse(actions);
  actions = _.map(actions, function(action) {
    action.label = _.humanize(action.label || action.name);
    return action;
  });
  
  return actions;
};

// Class methods

Form.helpers = {
  inputErrors: function() {
    // TODO avoid all this
    var idParts = this.id.split('_');
    var formName = idParts[0];
    var fieldName = idParts[1];
    var errors = Session.get(formName + 'Errors');
    if (errors && errors.details) {
      return errors.details[fieldName];
    }
  }
};

// Template helpers

Template.action.render = function() {
  var templateName = _.camelize(this.name + '_action');
  return Template[templateName] && Template[templateName](this);
};

Template.inputs.input = function() {
  var templateName = _.camelize(this.inputLayout + '_' + this.as +'_input');
  Template[templateName].errors = Form.helpers.inputErrors;
  return Template[templateName](this);
};

Template.form.actions = function() {
  var templateName = _.camelize(this.actionLayout + '_actions');
  return Template[templateName](this);
};

Template.errorsReason.errors = function() {
  var key = _.camelize(this.name + '_errors');
  var errors = Session.get(key);

  if (_.isString(errors))
    return { reason: errors, details: [] };
  else
    return errors;
};

Template.success.success = function() {
  var key = _.camelize(this.name + '_success');
  return Session.get(key);
};
