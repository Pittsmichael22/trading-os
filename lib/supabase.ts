import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://zooearmzdmpyosuqusyu.supabase.co"
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpvb2Vhcm16ZG1weW9zdXF1c3l1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2NTc2NjEsImV4cCI6MjA5MjIzMzY2MX0.DYCKNmDywJEU87uy-4sOOUs4ZShc2cmXeM-DF_qFxOo"

export const supabase = createClient(supabaseUrl, supabaseKey)