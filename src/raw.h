/* Copyright Sebastian Haas <sebastian@sebastianhaas.info>. All rights reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */
#include <vector>
#include <string>

#include <v8.h>
#include <node.h>

#include <pthread.h>

#include <linux/can.h>

using namespace node;
using namespace v8;
using namespace std;

#define DEFINE_ASYNC_CB(CLASS, func) static void func##_cb(uv_async_t* handle, int status)\
                                     {\
                                          assert(handle);\
                                          assert(handle->data);\
                                          reinterpret_cast<CLASS *>(handle->data)-> func (status);\
                                     }\
                                     void func(int status);

#define CHECK_CONDITION(expr, str) if(! (expr) ) return ThrowException(Exception::Error(String::New(str)));

//-----------------------------------------------------------------------------------------
/**
 * Channel object
 */
class RawChannel : ObjectWrap
{
public:
    static Persistent<FunctionTemplate> s_ct;
    static void Init(Handle<Object> target);

    RawChannel(const char *name, bool timestamps = false);
    ~RawChannel();

    static Handle<Value> New(const Arguments& args);
    static Handle<Value> AddListener(const Arguments& args);
    static Handle<Value> Start(const Arguments& args);
    static Handle<Value> Stop(const Arguments& args);
    static Handle<Value> Send(const Arguments& args);
    static Handle<Value> SetRxFilters(const Arguments& args);

    // UV async callbacks
    DEFINE_ASYNC_CB(RawChannel, async_receiver_ready);

    static void * c_thread_entry(void *_this) { assert(_this); reinterpret_cast<RawChannel *>(_this)->ThreadEntry(); return NULL; }
    void ThreadEntry();

    bool IsValid() { return m_SocketFd >= 0; }

private:
    uv_async_t m_AsyncReceiverReady;

    struct listener {
        Persistent<Object> handle;
        Persistent<Function> callback;
    };

    vector<struct listener *> m_Listeners;

    pthread_t m_Thread;
    string m_Name;

    int m_SocketFd;
    struct sockaddr_can m_SocketAddr;

    bool m_ThreadStopRequested;
    bool m_TimestampsSupported;
};
