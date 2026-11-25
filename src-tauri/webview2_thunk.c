#include <windows.h>

static HMODULE g_hLoader = NULL;

// Called only after Rust verifies every byte and holds a write/delete-denying file lock.
int goldstone_load_verified_webview2(PCWSTR path) {
    if (!g_hLoader) {
        g_hLoader = LoadLibraryExW(path, NULL, LOAD_LIBRARY_SEARCH_DLL_LOAD_DIR | LOAD_LIBRARY_SEARCH_SYSTEM32);
    }
    return g_hLoader != NULL;
}

static HMODULE get_loader(void) {
    return g_hLoader;
}

HRESULT __stdcall CompareBrowserVersions(PCWSTR version1, PCWSTR version2, int* result) {
    HMODULE h = get_loader();
    if (!h) return 0x80004005; // E_FAIL
    typedef HRESULT (__stdcall *PFN)(PCWSTR, PCWSTR, int*);
    PFN pfn = (PFN)GetProcAddress(h, "CompareBrowserVersions");
    return pfn ? pfn(version1, version2, result) : 0x80004005;
}

HRESULT __stdcall CreateCoreWebView2Environment(void* handler) {
    HMODULE h = get_loader();
    if (!h) return 0x80004005;
    typedef HRESULT (__stdcall *PFN)(void*);
    PFN pfn = (PFN)GetProcAddress(h, "CreateCoreWebView2Environment");
    return pfn ? pfn(handler) : 0x80004005;
}

HRESULT __stdcall CreateCoreWebView2EnvironmentWithOptions(PCWSTR bDir, PCWSTR uDir, void* opts, void* handler) {
    HMODULE h = get_loader();
    if (!h) return 0x80004005;
    typedef HRESULT (__stdcall *PFN)(PCWSTR, PCWSTR, void*, void*);
    PFN pfn = (PFN)GetProcAddress(h, "CreateCoreWebView2EnvironmentWithOptions");
    return pfn ? pfn(bDir, uDir, opts, handler) : 0x80004005;
}

HRESULT __stdcall GetAvailableCoreWebView2BrowserVersionString(PCWSTR bDir, PWSTR* version) {
    HMODULE h = get_loader();
    if (!h) return 0x80004005;
    typedef HRESULT (__stdcall *PFN)(PCWSTR, PWSTR*);
    PFN pfn = (PFN)GetProcAddress(h, "GetAvailableCoreWebView2BrowserVersionString");
    return pfn ? pfn(bDir, version) : 0x80004005;
}

HRESULT __stdcall GetAvailableCoreWebView2BrowserVersionStringWithOptions(PCWSTR bDir, void* opts, PWSTR* version) {
    HMODULE h = get_loader();
    if (!h) return 0x80004005;
    typedef HRESULT (__stdcall *PFN)(PCWSTR, void*, PWSTR*);
    PFN pfn = (PFN)GetProcAddress(h, "GetAvailableCoreWebView2BrowserVersionStringWithOptions");
    return pfn ? pfn(bDir, opts, version) : 0x80004005;
}

