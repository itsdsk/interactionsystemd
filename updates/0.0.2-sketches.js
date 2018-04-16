var keystone = require('keystone');

exports.create = {
    SketchChannel: [{
        'name': 'sketches',
        __ref: 'sketches'
    }],
    Sketch: [{
            'title': 'wrqrffref',
            'state': 'published',
            //'author': 'user@keystonejs.com',
            'localDir': 'sketch0',
            'thumbnails': 'screenshot.png',
            'prefThumb': 'screenshot.png',
        }, {
            'title': 'RGB Fade',
            'state': 'published',
            //'author': 'user@keystonejs.com',
            'localDir': 'sketch1',
            'thumbnails': 'screenshot.png',
            'prefThumb': 'screenshot.png',
        },
        {
            'title': 'Intensity Pulse',
            'state': 'published',
            //'author': 'user@keystonejs.com',
            'localDir': 'sketch2',
            'ipfsHash': 'QmaqNgz2fBVorb2rb4WF55fBq6Vymaenj5HT7oeMVJtJyS',
            'channels': 'sketches',
            'thumbnails': 'screenshot.png',
            'prefThumb': 'screenshot.png',
        },
        {
            'title': 'Decentralised',
            'state': 'published',
            //'author': 'user@keystonejs.com',
            'localDir': 'sketch3',
            'thumbnails': 'screenshot.png',
            'prefThumb': 'screenshot.png',
            'ipnsHash': 'QmZXWHxvnAPdX1PEc7dZHTSoycksUE7guLAih8z3b43UmU'
        }
    ],
};