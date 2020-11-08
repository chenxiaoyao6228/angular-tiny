import _ from 'lodash'
export default function $HttpProvider() {
  let defaults = (this.defaults = {
    headers: {
      common: {
        Accept: 'application/json, text/plain, */*'
      },
      post: {
        'Content-Type': 'application/json;charset=utf-8'
      },
      put: {
        'Content-Type': 'application/json;charset=utf-8'
      },
      patch: {
        'Content-Type': 'application/json;charset=utf-8'
      }
    },
    withCredentials: true
  })
  this.$get = [
    '$httpBackend',
    '$q',
    '$rootScope',
    function($httpBackend, $q, $rootScope) {
      function $http(requestConfig) {
        let config = Object.assign({ method: 'GET' }, requestConfig)
        config.headers = mergeHeaders(requestConfig)

        if (!config.withCredentials && defaults.withCredentials) {
          config.withCredentials = defaults.withCredentials
        }

        let reqData = transformData(config.data, config.transformRequest)

        if (!reqData) {
          _.forEach(config.headers, (v, k) => {
            if (k.toLowerCase() === 'content-type') {
              delete config.headers[k]
            }
          })
        }

        let deferred = $q.defer()
        function isSuccess(status) {
          return status >= 200 && status < 300
        }
        function done(status, response, headerString, statusText) {
          status = Math.max(status, 0)
          deferred[isSuccess(status) ? 'resolve' : 'reject']({
            status: status,
            data: response,
            statusText: statusText,
            headers: headersGetter(headerString),
            config: config
          })

          if (!$rootScope.$$phase) {
            $rootScope.$apply()
          }
        }
        $httpBackend(
          config.method,
          config.url,
          reqData,
          config.headers,
          done,
          config.withCredentials
        )
        return deferred.promise

        function mergeHeaders(config) {
          let reqHeaders = _.extend({}, config.headers)
          let defHeaders = _.extend(
            {},
            defaults.headers.common,
            defaults.headers[(config.method || 'get').toLowerCase()]
          )
          _.forEach(defHeaders, (value, key) => {
            let headerExists = _.some(reqHeaders, (v, k) => {
              return k.toLowerCase() === key.toLowerCase()
            })
            if (!headerExists) {
              reqHeaders[key] = value
            }
          })

          return executeHeaderFns(reqHeaders, config)
          function executeHeaderFns(headers, config) {
            return _.transform(
              headers,
              (result, v, k) => {
                if (_.isFunction(v)) {
                  v = v(config)
                  if (v === null || v === undefined) {
                    delete result[k]
                  } else {
                    result[k] = v
                  }
                }
              },
              headers
            )
          }
        }

        function headersGetter(headerString) {
          let headersObj
          headersObj = headersObj || parseHeaders(headerString)
          return function(name) {
            if (name) {
              return headersObj[name.toLowerCase()]
            } else {
              return headersObj
            }
          }
        }
        function parseHeaders(headers) {
          let lines = headers.split('\n')
          return _.transform(
            lines,
            (result, line) => {
              let separatorAt = line.indexOf(':')
              let name = line
                .substring(0, separatorAt)
                .toLowerCase()
                .trim()
              let value = line.substring(separatorAt + 1).trim()
              if (name) {
                result[name] = value
              }
            },
            {}
          )
        }
        function transformData(data, transform) {
          if (_.isFunction(transform)) {
            return transform(data)
          } else {
            return data
          }
        }
      }
      $http.defaults = defaults
      return $http
    }
  ]
}
