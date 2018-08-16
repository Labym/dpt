package com.chenhm.common.dpt;

import com.google.common.collect.Maps;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;
import java.util.Map;

public class OracleDataBase implements DataBase {

    private static final String PK_SQL="select col.* " +
            "from user_constraints con, user_cons_columns col " +
            "where " +
            "  con.constraint_name = col.constraint_name and con.constraint_type = 'P' " +
            "  and col.table_name = ?";


    private static final String COL_SQL="select " +
            "  utc.column_name, " +
            "  utc.data_type, " +
            "  utc.data_length, " +
            "  utc.data_precision, " +
            "  utc.data_Scale, " +
            "  utc.nullable, " +
            "  utc.data_default " +
            "from " +
            "  user_tab_columns utc " +
            "where " +
            "  utc.table_name = ? " +
            "order by " +
            "  column_id;";

    private final JdbcTemplate jdbcTemplate;
    private static final Map<String,TableMeta> TABLE_META_MAP= Maps.newConcurrentMap();

    public OracleDataBase(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public TableMeta table(String name) {
        TableMeta tableMeta = TABLE_META_MAP.get(name.toUpperCase());

        if(null!=tableMeta){
            return tableMeta;
        }

        List<Map<String, Object>> pks = jdbcTemplate.queryForList(PK_SQL, name);
        List<Map<String, Object>> col = jdbcTemplate.queryForList(PK_SQL, name);
        return null;
    }
}
