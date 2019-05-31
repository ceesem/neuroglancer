/**
 * @license
 * Copyright 2019 Google Inc.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {CancellationToken} from 'neuroglancer/util/cancellation';
import {cancellableFetchOk, getByteRangeHeader, responseArrayBuffer} from 'neuroglancer/util/http_request';
import {Uint64} from 'neuroglancer/util/uint64';

export function fetchHttpByteRange(
    url: string, startOffset: Uint64, endOffset: Uint64,
    cancellationToken: CancellationToken): Promise<ArrayBuffer> {
  return cancellableFetchOk(
      url, {headers: getByteRangeHeader(startOffset, endOffset)},
      responseArrayBuffer, cancellationToken);
}
