/*global module:false*/
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
          almond: true,
          include: ['sandbox'],
          baseUrl: 'lib',
          out: 'dist/broker.js',

          paths: {
            'lodash': '../node_modules/lodash/lodash',
            'rsvp': '../node_modules/rsvp/dist/rsvp-2.0.1.amd',
            'text': '../vendor/text',
            'tiny-jsonrpc': '../vendor/tiny-jsonrpc/lib/tiny-jsonrpc'
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
        latedef: true,
        newcap: true,
        noarg: true,
        sub: true,
        undef: true,
        unused: true,
        boss: true,
        eqnull: true,
        globals: {}
      },
      gruntfile: {
        src: 'Gruntfile.js'
      },
      lib_test: {
        src: ['lib/**/*.js', 'test/**/*.js']
      }
    },
    watch: {
      gruntfile: {
        files: '<%= jshint.gruntfile.src %>',
        tasks: ['jshint:gruntfile']
      },
      lib_test: {
        files: '<%= jshint.lib_test.src %>',
        tasks: ['jshint:lib_test']
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

  grunt.loadNpmTasks('grunt-requirejs');

  // Load the Intern task
  grunt.loadNpmTasks('intern');

  // Register a test task that uses Intern
  grunt.registerTask('test', [ 'intern' ]);

  // By default we just test
  grunt.registerTask('default', [ 'test' ]);
};
