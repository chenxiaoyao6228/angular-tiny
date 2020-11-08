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
    }
  })
  this.$get = [
    '$httpBackend',
    '$q',
    '$rootScope',
    function($httpBackend, $q, $rootScope) {
      function $http(requestConfig) {
        let config = Object.assign({ method: 'GET' }, requestConfig)
        let h = mergeHeaders(requestConfig)
        // eslint-disable-next-line
        console.log('h', h);
        config.headers = mergeHeaders(requestConfig)

        let deferred = $q.defer()
        function isSuccess(status) {
          return status >= 200 && status < 300
        }
        function done(status, response, statusText) {
          status = Math.max(status, 0)
          deferred[isSuccess(status) ? 'resolve' : 'reject']({
            status: status,
            data: response,
            statusText: statusText,
            config: config
          })

          if (!$rootScope.$$phase) {
            $rootScope.$apply()
          }
        }
        $httpBackend(
          config.method,
          config.url,
          config.data,
          config.headers,
          done
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
          return reqHeaders
        }
      }
      $http.defaults = defaults
      return $http
    }
  ]
}
