Parse.Cloud.beforeSave('SomeBlockchainClassWithTriggers', ({ object }) => {
  object.set('someOtherField', 'someOtherValue');
  return object;
});

Parse.Cloud.afterSave('SomeBlockchainClassWithTriggers', ({ object }) => {
  object.set('someNotSavedField', 'someNotSavedValue');
  return object;
});

Parse.Cloud.beforeDelete('SomeBlockchainClassWithTriggers', () => {
  throw new Error('Should never file');
});

Parse.Cloud.beforeSave('SomeRegularClassWithTriggers', ({ object }) => {
  object.set('someOtherField', 'someOtherValue');
  return object;
});

Parse.Cloud.afterSave('SomeRegularClassWithTriggers', ({ object }) => {
  object.set('someNotSavedField', 'someNotSavedValue');
  return object;
});

Parse.Cloud.beforeDelete('SomeRegularClassWithTriggers', ({ object }) => {
  if (object.get('confirmDelete') !== true) {
    throw new Error('confirmDelete is not true');
  }
});
