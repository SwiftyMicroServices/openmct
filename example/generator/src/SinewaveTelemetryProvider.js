/*****************************************************************************
 * Open MCT Web, Copyright (c) 2014-2015, United States Government
 * as represented by the Administrator of the National Aeronautics and Space
 * Administration. All rights reserved.
 *
 * Open MCT Web is licensed under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 *
 * Open MCT Web includes source code licensed under additional open source
 * licenses. See the Open Source Licenses file (LICENSES.md) included with
 * this source code distribution or the Licensing information page available
 * at runtime from the About dialog for additional information.
 *****************************************************************************/
/*global define,setInterval,clearInterval*/

/**
 * Module defining SinewaveTelemetryProvider. Created by vwoeltje on 11/12/14.
 * Rewritten by larkin on 05/06/2016.
 */
define(
    ["./SinewaveTelemetrySeries"],
    function (SinewaveTelemetrySeries) {
        "use strict";

        /**
         *
         * @constructor
         */
        function SinewaveTelemetryProvider($q, $timeout) {
            this.$q = $q;
            this.$timeout = $timeout;
        }

        SinewaveTelemetryProvider.prototype.canHandleRequest = function (request) {
            return request.source === 'generator';
        };

        SinewaveTelemetryProvider.prototype.requestTelemetry = function (requests) {
            var sinewaveRequests = requests.filter(this.canHandleRequest, this),
                response = {
                    generator: {}
                };

            sinewaveRequests.forEach(function (request) {
                response.generator[request.key] = this.singleRequest(request);
            }, this);

            return response;
        };

        SinewaveTelemetryProvider.prototype.subscribe = function (callback, requests) {
            var sinewaveRequests = requests.filter(this.canHandleRequest, this),
                unsubscribers = sinewaveRequests.map(function (request) {
                    return this.singleSubscribe(
                        function (series) {
                            var response = {
                                generator: {}
                            };
                            response.generator[request.key] = series;
                            callback(response);
                        },
                        request
                    );
                }, this);

            return function () {
                unsubscribers.forEach(function (unsubscribe) {
                    unsubscribe();
                });
            };
        };

        SinewaveTelemetryProvider.prototype.singleRequest = function (request) {
            var start = Math.floor(request.start / 1000) * 1000,
                end = Math.floor(request.end / 1000) * 1000,
                period = request.period || 30,
                data = [],
                current,
                i;

            for (current = start; current <= end; current += 2000) {
                i = Math.floor((current - start) / 1000);
                data.push({
                    sin: Math.sin(i * Math.PI * 2 / period),
                    cos: Math.cos(i * Math.PI * 2 / period),
                    positive: Math.sin(i * Math.PI * 2 / period) >= 0,
                    time: current,
                    yesterday: current - (60 * 60 * 24 * 1000),
                    delta: current
                });
            }
            return new SinewaveTelemetrySeries(data);
        };


        SinewaveTelemetryProvider.prototype.singleSubscribe = function (callback, options) {
            // calculate interval position based on start - end; such that this data will line up with data generated by singleRequest.
            var start = Math.floor((options.start || Date.now()) / 1000) * 1000,
                currentTime = Math.floor((options.end || Date.now()) / 1000) * 1000,
                period = options.period || 30,
                unsubscribe,
                generatePoint,
                interval;

            generatePoint = function () {
                var i = Math.floor((currentTime - start) / 1000),
                    point = {
                        sin: Math.sin(i * Math.PI * 2 / period),
                        cos: Math.cos(i * Math.PI * 2 / period),
                        positive: Math.sin(i * Math.PI * 2 / period) >= 0,
                        time: currentTime,
                        yesterday: currentTime - (60 * 60 * 24 * 1000),
                        delta: currentTime
                    };
                currentTime += 1000;
                return point;
            };

            interval = setInterval(function () {
                var series = new SinewaveTelemetrySeries(generatePoint());
                callback(series);
            }, 1000);

            unsubscribe = function () {
                clearInterval(interval);
            };

            return unsubscribe;
        };



        return SinewaveTelemetryProvider;
    }
);
