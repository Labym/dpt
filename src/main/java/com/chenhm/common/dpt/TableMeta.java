package com.chenhm.common.dpt;

import lombok.Data;

@Data
public class TableMeta {
    private String type;
    private String tableName;
    private String[] fields;
    private String [] primaryKeys;
}
