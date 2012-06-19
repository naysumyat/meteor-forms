var clearOnSuccessForm = new Form({
  name: 'clearOnSuccessForm',
  classes: 'well',
  method: artificialDelay,
  clearOnSuccess: true,
  messages: {
    success: 'Great, your story was saved!'
  },
  inputs: [
    'title',
    'body', {
      as: 'textarea',
      value: 'Some default text!', 
      hint: 'Some help text about the field'
    },
    'allow_comments', {
      label: 'Allow commenting on this story',
      as: 'checkbox',
      value: true
    }
  ],
  actions: [
    'cancel',
    'submit', {
      label: 'Save'
    }
  ]
});