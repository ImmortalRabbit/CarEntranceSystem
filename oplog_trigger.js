var mongoOplog = require('mongo-oplog');

const oplog = mongoOplog('mongodb://127.0.0.1:27017/local', {ns: 'parking.awaiting_verified'});

oplog.tail();


/*oplog.on('op', data => {
  console.log(data);
});*/
 
oplog.on('insert', doc => {
  console.log(doc);
});
 
oplog.on('update', doc => {
  console.log(doc);
});
 
oplog.on('delete', doc => {
  console.log(doc.o._id);
});
 
oplog.on('error', error => {
  console.log(error);
});
 
oplog.on('end', () => {
  console.log('Stream ended');
});
 