import _ from 'lodash'
import utils from '../src/utils'
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
          utils.isObject(data) &&
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
    if (utils.isString(data)) {
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

        if (utils.isString(config.paramSerializer)) {
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
          utils.forEach(config.headers, (k, v) => {
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
        if (utils.isObject(headers)) {
          return utils.transform(
            headers,
            (result, v, k) => {
              result[k.toLocaleLowerCase().trim()] = v.trim()
            },
            {}
          )
        } else {
          let lines = headers.split('\n')
          return utils.transform(
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
        let reqHeaders = Object.assign({}, config.headers)
        let defHeaders = Object.assign(
          {},
          defaults.headers.common,
          defaults.headers[(config.method || 'get').toLowerCase()]
        )
        utils.forEach(defHeaders, (key, value) => {
          let headerExists = utils.some(reqHeaders, (v, k) => {
            return k.toLowerCase() === key.toLowerCase()
          })
          if (!headerExists) {
            reqHeaders[key] = value
          }
        })

        return executeHeaderFns(reqHeaders, config)
        function executeHeaderFns(headers, config) {
          return utils.transform(
            headers,
            (result, v, k) => {
              if (utils.isFunction(v)) {
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
        if (utils.isFunction(transform)) {
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
      ;['get', 'head', 'delete'].forEach(method => {
        $http[method] = function(url, config) {
          return $http(
            Object.assign({}, config, { url, method: method.toUpperCase() })
          )
        }
      })
      return $http
    }
  ]
}
export function $HttpParamSerializerProvider() {
  this.$get = function() {
    return function serializeParams(params) {
      let parts = []
      utils.forEach(params, (key, value) => {
        if (value === undefined && value === null) {
          return
        }
        if (!Array.isArray(value)) {
          value = [value]
        }
        utils.forEach(value, v => {
          if (v === undefined || v === null) {
            return
          }
          if (utils.isObject(v)) {
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
      function serialize(value, prefix) {
        if (value === null || value === undefined) {
          return
        }
        if (Array.isArray(value)) {
          utils.forEach(value, v => {
            serialize(v, prefix + '[]')
          })
        } else if (utils.isObject(value) && !utils.isDate(value)) {
          utils.forEach(value, (k, v) => {
            serialize(v, prefix + '[' + k + ']')
          })
        } else {
          parts.push(
            encodeURIComponent(prefix) + '=' + encodeURIComponent(value)
          )
        }
      }
      utils.forEach(params, (key, value) => {
        if (value === null || value === undefined) {
          return
        }
        if (Array.isArray(value)) {
          utils.forEach(value, v => {
            serialize(v, key + '[]')
          })
        } else if (utils.isObject(value) && !utils.isDate(value)) {
          utils.forEach(value, (k, v) => {
            serialize(v, key + '[' + k + ']')
          })
        } else {
          parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(value))
        }
      })
      return parts.join('&')
    }
  }
}
