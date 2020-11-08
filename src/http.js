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
    transformRequest: [
      function(data) {
        if (
          _.isObject(data) &&
          !isBlob(data) &&
          !isFile(data) &&
          !isFormData(data)
        ) {
          return JSON.stringify(data)
        } else {
          return data
        }
        function isBlob(object) {
          return object.toString() === '[object Blob]'
        }
        function isFile(object) {
          return object.toString() === '[object File]'
        }
        function isFormData(object) {
          return object.toString() === '[object FormData]'
        }
      }
    ],
    transformResponse: [defaultHttpResponseTransform],
    paramSerializer: '$httpParamSerializer'
  })
  function defaultHttpResponseTransform(data, headers) {
    if (_.isString(data)) {
      let contentType = headers('Content-Type')
      if (
        (contentType && contentType.indexOf('application/json') === 0) ||
        isJsonLike(data)
      ) {
        return JSON.parse(data)
      }
    }
    return data
    function isJsonLike(data) {
      if (data.match(/^\{(?!\{)/)) {
        return data.match(/\}$/)
      } else if (data.match(/^\[/)) {
        return data.match(/\]$/)
      }
    }
  }
  this.$get = [
    '$httpBackend',
    '$q',
    '$rootScope',
    '$injector',
    function($httpBackend, $q, $rootScope, $injector) {
      function $http(requestConfig) {
        let config = Object.assign(
          {
            method: 'GET',
            transformRequest: defaults.transformRequest,
            transformResponse: defaults.transformResponse,
            paramSerializer: defaults.paramSerializer
          },
          requestConfig
        )
        config.headers = mergeHeaders(requestConfig)

        if (_.isString(config.paramSerializer)) {
          config.paramSerializer = $injector.get(config.paramSerializer)
        }

        if (!config.withCredentials && defaults.withCredentials) {
          config.withCredentials = defaults.withCredentials
        }

        let reqData = transformData(
          config.data,
          headersGetter(config.headers),
          undefined,
          config.transformRequest
        )

        if (!reqData) {
          _.forEach(config.headers, (v, k) => {
            if (k.toLowerCase() === 'content-type') {
              delete config.headers[k]
            }
          })
        }

        function transformResponse(response) {
          if (response.data) {
            response.data = transformData(
              response.data,
              response.headers,
              response.status,
              config.transformResponse
            )
          }

          if (isSuccess(response.status)) {
            return response
          } else {
            return $q.reject(response)
          }
        }

        return sendReq(config, reqData).then(
          transformResponse,
          transformResponse
        )
      }
      function sendReq(config, reqData) {
        let deferred = $q.defer()

        let url = buildUrl(config.url, config.paramSerializer(config.params))

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
          url,
          reqData,
          config.headers,
          done,
          config.withCredentials
        )
        return deferred.promise
      }
      // helpers
      function buildUrl(url, serializedParams) {
        if (serializedParams.length) {
          url += url.indexOf('?') > -1 ? '&' : '?'
          url += serializedParams
        }
        return url
      }
      function isSuccess(status) {
        return status >= 200 && status < 300
      }
      function parseHeaders(headers) {
        if (_.isObject(headers)) {
          return _.transform(
            headers,
            (result, v, k) => {
              result[k.toLocaleLowerCase().trim()] = v.trim()
            },
            {}
          )
        } else {
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
      function transformData(data, headers, status, transform) {
        if (_.isFunction(transform)) {
          return transform(data, headers, status)
        } else if (Array.isArray(transform)) {
          return transform.reduce((data, fn) => {
            return fn(data, headers, status)
          }, data)
        } else {
          return data
        }
      }
      $http.defaults = defaults
      return $http
    }
  ]
}
export function $HttpParamSerializerProvider() {
  this.$get = function() {
    return function serializeParams(params) {
      let parts = []
      _.forEach(params, (value, key) => {
        if (value === undefined && value === null) {
          return
        }
        if (!Array.isArray(value)) {
          value = [value]
        }
        _.forEach(value, v => {
          if (v === undefined || v === null) {
            return
          }
          if (_.isObject(v)) {
            v = JSON.stringify(v)
          }
          parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(v))
        })
      })
      return parts.join('&')
    }
  }
}

export function $HttpParamSerializerJQLikeProvider() {
  this.$get = function() {
    return function(params) {
      let parts = []
      _.forEach(params, (value, key) => {
        if (value === null || value === undefined) {
          return
        }
        if (Array.isArray(value)) {
          _.forEach(value, v => {
            parts.push(
              encodeURIComponent(key + '[]') + '=' + encodeURIComponent(v)
            )
          })
        } else if (_.isObject(value) && !_.isDate(value)) {
          _.forEach(value, (v, k) => {
            parts.push(
              encodeURIComponent(key + '[' + k + ']') +
                '=' +
                encodeURIComponent(v)
            )
          })
        } else {
          parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(value))
        }
      })
      return parts.join('&')
    }
  }
}
