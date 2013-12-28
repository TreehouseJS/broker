'use strict';

module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    // Metadata.
    pkg: grunt.file.readJSON('package.json'),
    requirejs: {
      dist: {
        options: {
          logLevel: 1,

          wrap: {
            startFile: 'build/broker.start.frag.js',
            endFile: 'build/broker.end.frag.js'
          },
          name: '../node_modules/almond/almond',
          include: ['sandbox'],
          baseUrl: 'lib',
          out: 'dist/broker.js',

          paths: {
            'lodash': '../node_modules/lodash/lodash',
            'rsvp': '../node_modules/rsvp/dist/rsvp-2.0.1.amd',
            'text': '../vendor/text',
            'tiny-jsonrpc': '../node_modules/' +
              'tiny-jsonrpc/lib/tiny-jsonrpc',
            'tiny-jsonrpc-postmessage': '../node_modules/' +
              'tiny-jsonrpc-postmessage/lib/tiny-jsonrpc-postmessage'
          },

          //generateSourceMaps: true,
          //preserveLicenseComments: false
          optimize: 'none'
        }
      }
    },
    jshint: {
      options: {
        curly: true,
        eqeqeq: true,
        immed: true,
        indent: 2,
        latedef: true,
        maxlen: 80,
        newcap: true,
        noarg: true,
        nonew: true,
        quotmark: 'single',
        strict: true,
        sub: true,
        trailing: true,
        undef: true,
        unused: true,
        globals: {}
      },
      gruntfile: {
        options: {
          node: true
        },
        src: 'Gruntfile.js'
      },
      broker: {
        options: {
          worker: true
        },
        src: ['lib/broker.js']
      },
      sandbox: {
        options: {
          browser: true,
          globals: {
            define: false,
            require: false
          }
        },
        src: ['lib/sandbox.js']
      }
    },
    watch: {
      gruntfile: {
        files: '<%= jshint.gruntfile.src %>',
        tasks: ['jshint:gruntfile']
      }
    },
    intern: {
      broker: {
        options: {
          runType: 'runner', // defaults to 'client'
          config: 'tests/intern'
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-requirejs');
  grunt.loadNpmTasks('grunt-contrib-jshint');

  // Load the Intern task
  grunt.loadNpmTasks('intern');

  // Register a test task that uses Intern
  grunt.registerTask('test', [ 'intern' ]);

  // By default we just test
  grunt.registerTask('default', [ 'test' ]);
};
