#include <windows.h>
#include <stdlib.h>
#include <stdint.h>

// 1. Security cookie stubs
uintptr_t __security_cookie = 0x2B992DDFA232;
void __security_check_cookie(uintptr_t cookie) {
    (void)cookie;
}

// 2. Thread init stubs
int _Init_thread_epoch = 0;
void _Init_thread_header(int* p) {
    if (p) *p = -1;
}
void _Init_thread_footer(int* p) {
    if (p) *p = -1;
}

// 3. Purecall stub
void _purecall(void) {}

// 4. (CFGuard is provided by libmingwex)

// 5. C++ std::nothrow symbol: ?nothrow@std@@3Unothrow_t@1@B
__attribute__((section(".rdata")))
const char _nothrow_dummy = 0;
__attribute__((alias("_nothrow_dummy")))
extern const char nothrow_sym;

// 6. C++ operator new/delete with MSVC mangled symbols:
// ??_U@YAPEAX_K@Z: void * __cdecl operator new[](unsigned __int64)
void* __cdecl msvc_new_arr(size_t size) {
    return malloc(size);
}

// ??_V@YAXPEAX@Z: void __cdecl operator delete[](void *)
void __cdecl msvc_del_arr(void* ptr) {
    free(ptr);
}

// ??2@YAPEAX_KAEBUnothrow_t@std@@@Z: void * __cdecl operator new(unsigned __int64, struct std::nothrow_t const &)
void* __cdecl msvc_new_nothrow(size_t size, const void* nothrow) {
    (void)nothrow;
    return malloc(size);
}

// ??3@YAXPEAX_K@Z: void __cdecl operator delete(void *, unsigned __int64)
void __cdecl msvc_del_size(void* ptr, size_t size) {
    (void)size;
    free(ptr);
}

// Provide the mangled symbols via asm aliases:
__asm__(".globl \"??_U@YAPEAX_K@Z\"\n\t"
        ".def \"??_U@YAPEAX_K@Z\"; .scl 2; .type 32; .endef\n\t"
        "\"??_U@YAPEAX_K@Z\" = msvc_new_arr");

__asm__(".globl \"??_V@YAXPEAX@Z\"\n\t"
        ".def \"??_V@YAXPEAX@Z\"; .scl 2; .type 32; .endef\n\t"
        "\"??_V@YAXPEAX@Z\" = msvc_del_arr");

__asm__(".globl \"??2@YAPEAX_KAEBUnothrow_t@std@@@Z\"\n\t"
        ".def \"??2@YAPEAX_KAEBUnothrow_t@std@@@Z\"; .scl 2; .type 32; .endef\n\t"
        "\"??2@YAPEAX_KAEBUnothrow_t@std@@@Z\" = msvc_new_nothrow");

__asm__(".globl \"??3@YAXPEAX_K@Z\"\n\t"
        ".def \"??3@YAXPEAX_K@Z\"; .scl 2; .type 32; .endef\n\t"
        "\"??3@YAXPEAX_K@Z\" = msvc_del_size");

__asm__(".globl \"?nothrow@std@@3Unothrow_t@1@B\"\n\t"
        ".def \"?nothrow@std@@3Unothrow_t@1@B\"; .scl 2; .type 32; .endef\n\t"
        "\"?nothrow@std@@3Unothrow_t@1@B\" = _nothrow_dummy");

