Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class WC {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct CRED {
        public int F; public int T; public string TN; public string C;
        public long LW; public int BS; public IntPtr B;
        public int P; public int AC; public IntPtr A; public string TA; public string UN;
    }
    [DllImport("advapi32", CharSet=CharSet.Unicode, SetLastError=true)]
    public static extern bool CredReadW(string t, int type, int flags, out IntPtr p);
    [DllImport("advapi32")] public static extern void CredFree(IntPtr p);
    public static string G(string t) {
        IntPtr p;
        if (!CredReadW(t, 1, 0, out p)) return "";
        var c = (CRED)Marshal.PtrToStructure(p, typeof(CRED));
        var r = Marshal.PtrToStringUni(c.B, c.BS/2);
        CredFree(p);
        return r;
    }
}
"@
[WC]::G("git:https://github.com")
